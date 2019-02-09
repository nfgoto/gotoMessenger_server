const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');

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
            error.code = 401;
            throw error;
        }

        return {
            post: {
                ...createdPost._doc,
                _id: createdPost._id,
                createdAt: createdPost.createdAt.toISOString(),
                updatedAt: createdPost.updatedAt.toISOString()
            },
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

        const totalPosts = await Post.find({ creator: req.userId }).countDocuments();
        const posts = await Post.find({ creator: req.userId })
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
    }

};