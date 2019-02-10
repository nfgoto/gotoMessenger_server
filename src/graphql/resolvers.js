const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const clearImage = require('../utils/clearImage');

const User = require('../models/user');
const Post = require('../models/post');

// one method per query defined in schema
module.exports = {
    createUser: async function ({ userInput }/* , req */) {
        const {
            email,
            name,
            password
        } = userInput;

        const errors = [];
        if (!validator.isEmail(email)) {
            errors.push({ message: 'Invalid Email.' });
        }
        if (
            validator.isEmpty(password) ||
            !validator.isLength(password, { min: 5 })
        ) {
            errors.push({ message: 'Password Too Short.' });
        }

        if (errors.length > 0) {
            const error = new Error('Invalid Input.');
            error.data = errors;
            error.code = 422;
            throw error;
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            const error = new Error('User Already Exists.');
            error.code = 422;
            throw error;
        }

        // if using promises, you need to return it and the resolver because GraphQL will not wait for resolution
        // wait is automatic with AsyncAwait
        try {
            const hashedPassword = await bcrypt.hash(password, 12);
            if (!hashedPassword) {
                const error = new Error('Password hashing failed.');
                throw error;
            }

            const user = new User({
                email,
                password: hashedPassword,
                name
            });

            const createdUser = await user.save();


            // _doc to retrieve the doc without mongoDB added data
            return {
                ...createdUser._doc,
                _id: createdUser._id.toString()
            };
        } catch (error) {
            const err = new Error('Error when sacing user');
            err.data = error;
            throw err;
        }
    },

    login: async (args/* , req */) => {
        const { email, password } = args;

        // validate input data

        const errors = [];
        if (!validator.isEmail(email)) {
            errors.push({ message: 'Invalid Email.' });
        }
        if (validator.isEmpty(password)) {
            errors.push({ message: 'Password Emoty.' });
        }

        if (errors.length > 0) {
            const error = new Error('Invalid Input.');
            error.data = errors;
            error.code = 422;
            throw error;
        }

        // find user

        const user = await User.findOne({ email });
        if (!user) {
            const error = new Error('User Not Found.');
            error.code = 401;
            throw error;
        }

        // check password

        const isEqual = await bcrypt.compare(password, user.password);
        if (!isEqual) {
            const error = new Error('Wrong Password.');
            error.code = 401;
            throw error;
        }

        // generate token

        const payload = {
            userId: user._id.toString(),
            email: user.email
        };
        const token = jwt.sign(payload, process.env.SECRET, { expiresIn: '1h' });

        return {
            token,
            userId: user._id.toString()
        };
    },

    createPost: async ({ postInput }, req) => {
        if (!req.isAuth) {
            const error = new Error('Error Not Authenticated');
            error.code = 401;
            throw error;
        }
        const { title, content, imageUrl } = postInput;

        const errors = [];
        if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
            errors.push({ message: 'Title Too Short' });
        }
        if (validator.isEmpty(content) || !validator.isLength(content, { min: 5 })) {
            errors.push({ message: 'Content Too Short' });
        }
        if (validator.isEmpty(imageUrl)) {
            errors.push({ message: 'Image URL is Empty' });
        }
        if (errors.length > 0) {
            const error = new Error('Invalid Post Data');
            error.data = errors;
            throw error;
        }

        const loggedInUser = await User.findById(req.userId);
        if (!loggedInUser) {
            const error = new Error('Error Not Authenticated');
            error.code = 401;
            throw error;
        }

        const post = new Post({
            title,
            content,
            imageUrl,
            creator: loggedInUser
        });

        const createdPost = await post.save();
        if (!createdPost) {
            const error = new Error('Error With Post Creation');
            throw error;
        }

        loggedInUser.posts.push(createdPost);
        const updatedUser = await loggedInUser.save();
        if (!updatedUser) {
            const error = new Error('Error When Associating New Post To Logged User');
            throw error;
        }

        return {
            ...createdPost._doc,
            _id: createdPost._id,
            createdAt: createdPost.createdAt.toISOString(),
            updatedAt: createdPost.updatedAt.toISOString(),
            creator: {
                _id: updatedUser._id.toString(),
                name: updatedUser.name
            }
        };
    },

    fetchPosts: async ({ page = 1 }, req) => {
        if (!req.isAuth) {
            const error = new Error('Error Not Authenticated');
            error.code = 401;
            throw error;
        }

        const currentPage = page;
        const perPage = 2;

        const totalPosts = await Post.find().countDocuments();
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .skip((currentPage - 1) * perPage)
            .limit(perPage)
            .populate('creator');
        if (!posts) {
            const error = new Error('Error Not Authenticated');
            error.code = 401;
            throw error;
        }

        const formattedPosts = posts.map(post => ({
            _id: post._id.toString(),
            title: post.title,
            content: post.content,
            imageUrl: post.imageUrl,
            creator: {
                ...post.creator._doc,
                _id: post.creator._id.toString(),
                createdAt: post.creator.createdAt.toISOString(),
                updatedAt: post.creator.updatedAt.toISOString()
            },
            createdAt: post.createdAt.toISOString(),
            ipdatedAt: post.updatedAt.toISOString()
        }));

        return {
            posts: formattedPosts,
            totalPosts
        };
    },

    fetchSinglePost: async (args, req) => {
        if (!req.isAuth) {
            const error = new Error('Error Not Authenticated');
            error.code = 401;
            throw error;
        }

        const loadedPost = await Post.findById(args.postId).populate('creator');
        if (!loadedPost) {
            const error = new Error('Post Not Found');
            error.code = 404;
            throw error;
        }

        return {
            ...loadedPost._doc,
            _id: loadedPost._id.toString(),
            createdAt: loadedPost.createdAt.toISOString(),
            updatedAt: loadedPost.updatedAt.toISOString()
        };
    },

    editPost: async (args, req) => {
        if (!req.isAuth) {
            const error = new Error('Error Not Authenticated');
            error.code = 401;
            throw error;
        }

        const { postId, postInput } = args;
        const { title, content, imageUrl } = postInput;

        const loadedPost = await Post.findById(postId).populate('creator');
        if (!loadedPost) {
            const error = new Error('Post Not Found');
            error.code = 404;
            throw error;
        }

        const loggedInUser = await User.findById(req.userId);
        if (!loggedInUser) {
            const error = new Error('Not Authenticated');
            error.code = 401;
            throw error;
        }

        if (loadedPost.creator._id.toString() !== req.userId) {
            const error = new Error('Not Authorized');
            error.code = 403;
            throw error;
        }

        const errors = [];
        if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
            errors.push({ message: 'Title Too Short' });
        }
        if (validator.isEmpty(content) || !validator.isLength(content, { min: 5 })) {
            errors.push({ message: 'Content Too Short' });
        }
        if (validator.isEmpty(imageUrl)) {
            errors.push({ message: 'Image URL is Empty' });
        }
        if (errors.length > 0) {
            const error = new Error('Invalid Post Data');
            error.data = errors;
            throw error;
        }

        loadedPost.title = title;
        loadedPost.content = content;
        // imageUrl input arg "undefined" in mutation shen no image edit
        if (imageUrl !== 'undefined') {
            loadedPost.imageUrl = imageUrl;
        }

        const updatedPost = await loadedPost.save();
        if (!updatedPost) {
            const error = new Error('Post Edit Error');
            throw error;
        }

        return {
            ...updatedPost._doc,
            _id: updatedPost._id.toString(),
            createdAt: updatedPost.createdAt.toISOString(),
            updatedAt: updatedPost.updatedAt.toISOString()
        };

    },

    deletePost: async ({ postId }, req) => {
        if (!req.isAuth) {
            const error = new Error('Error Not Authenticated');
            error.code = 401;
            throw error;
        }

        const loadedPost = await Post.findById(postId).populate('creator');
        if (!loadedPost) {
            const error = new Error('Post To Delete Not Found');
            error.code = 404;
            throw error;
        }

        if (loadedPost.creator._id.toString() !== req.userId) {
            const error = new Error('Not Authorized');
            error.code = 403;
            throw error;
        }

        const deletedPost = await Post.findByIdAndDelete(postId);
        if (!deletedPost) {
            const error = new Error('Post Delete Error');
            throw error;
        }

        clearImage(deletedPost.imageUrl);

        const loggedInUser = await User.findById(req.userId);
        if (!loggedInUser) {
            const error = new Error('Not Authenticated');
            error.code = 401;
            throw error;
        }

        loggedInUser.posts.pull(deletedPost._id);
        const updatedUser = await loggedInUser.save();
        if (!updatedUser) {
            const error = new Error('Error When Deleting Post From Logged User');
            throw error;
        }


        return {
            ...deletedPost._doc,
            _id: deletedPost._id.toString(),
            createdAt: deletedPost.createdAt.toISOString(),
            updatedAt: deletedPost.updatedAt.toISOString()
        };
    },
    editUserStatus: async ({ newStatus }, req) => {
        if (!req.isAuth) {
            const error = new Error('Error Not Authenticated');
            error.code = 401;
            throw error;
        }

        const errors = [];
        if (validator.isEmpty(newStatus)) {
            errors.push({ message: 'Status Cannot Be Emoty' });
        }
        if (!validator.isLength(newStatus, { min: 2 })) {
            errors.push({ message: 'Status Is Too Short' });
        }
        if (errors.length > 0) {
            const error = new Error('Status Validation Error');
            error.code = 422;
            throw error;
        }

        const loggedInUser = await User.findById(req.userId);
        if (!loggedInUser) {
            const error = new Error('Not Authenticated');
            error.code = 401;
            throw error;
        }

        loggedInUser.status = newStatus;
        try {
            const updatedUser = await loggedInUser.save();
            if (!updatedUser) {
                const error = new Error('Error When Updating User Statust');
                throw error;
            }
            return updatedUser.status;
        } catch (error) {
            throw error;
        }
    },

    user: async (args, req) => {
        if (!req.isAuth) {
            const error = new Error('Error Not Authenticated');
            error.code = 401;
            throw error;
        }

        try {
            const loggedInUser = await User.findById(req.userId);
            if (!loggedInUser) {
                const error = new Error('Not Authenticated');
                error.code = 401;
                throw error;
            }
            return {
                ...loggedInUser._doc,
                _id: loggedInUser._id.toString(),
                createdAt: loggedInUser.createdAt.toISOString(),
                updatedAt: loggedInUser.updatedAt.toISOString()
            };
        } catch (error) {
            throw error;
        }
    }

};