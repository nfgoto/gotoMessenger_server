const { validationResult } = require('express-validator/check');

const io = require('../socket');
const Post = require('../models/post');
const User = require('../models/user');

const deleteImageFromStorage = require('../utils/clearImage');

exports.getPosts = async (req, res, next) => {
    const currentPage = req.query.page || 1;
    const perPage = 2;

    try {

        const totalItems = await Post.find().countDocuments();
        const posts = await Post.find()
            .populate('creator')
            .sort({ createdAt: -1 }) //  sort from most recent
            .skip((currentPage - 1) * perPage)
            .limit(perPage);
        if (!posts) {
            const error = new Error('No posts found.');
            error.statusCode = 404;
            // we can throw because will reach the catch block and get to the error handling middleware
            throw error;
        }

        return res
            .status(200)
            .json({
                posts,
                totalItems
            });
    } catch (error) {
        errorHandler(error, next);
    }
};

exports.postPost = (req, res, next) => {
    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {
        const error = new Error('Validation failed.');
        error.statusCode = 422;
        error.data = validationErrors.array();
        // can throw because sync code, will reach the next catch statement
        throw error;
    }

    if (!req.file) {
        const error = new Error('No image provided.');
        error.statusCode = 422;
        throw error;
    }

    const title = req.body.title;
    const content = req.body.content;
    const imageUrl = req.file.path;

    const post = new Post({
        title,
        content,
        imageUrl,
        creator: req.userId
    });

    post.save()
        .then(
            () => {
                // find connected user
                return User.findById(req.userId);
            }
        )
        .then(
            user => {
                if (!user) {
                    const error = new Error('No User Found.');
                    error.statusCode = 404;
                    throw error;
                }

                // add new post to connected user post list
                user.posts.push(post);
                return user.save();
            }
        )
        .then(
            user => {
                if (!user) {
                    const error = new Error('No User Found.');
                    error.statusCode = 404;
                    throw error;
                }

                // inform all subscribed/connected clients
                io.getIO().emit(
                    // name of the channel
                    'posts',
                    {
                        action: 'create',
                        post
                    }
                );

                return res
                    .status(201)
                    .json({
                        message: 'Post created succesfully',
                        post: {
                            ...post._doc,
                            creator: {
                                _id: req.userId,
                                name: user.name
                            }
                        },
                        creator: {
                            _id: user._id,
                            name: user.name
                        }
                    });
            }

        )
        .catch(err => errorHandler(err, next));
};

exports.getPost = (req, res, next) => {
    const { params: { postId } } = req;

    Post.findById(postId)
        .then(
            post => {
                if (!post) {
                    const error = new Error('No post found.');
                    error.statusCode = 404;
                    throw error;
                }
                return res.json({ message: 'post fetched', post });
            }
        )
        .catch(err => errorHandler(err, next));
};

exports.putPost = (req, res, next) => {
    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {
        const error = new Error('Validation failed.');
        error.statusCode = 422;
        error.data = validationErrors.array();
        throw error;
    }

    const {
        title,
        content,
        // default case when no new image - handled on the front-end to send existing image on the body
        image
    } = req.body;

    const imageUrl = req.file
        ? req.file.path
        : image
            // no happy path please
            ? image
            : (() => {
                const error = new Error('No File was picked.');
                error.statusCode(422);
                throw error;
            })();

    Post.findById(req.params.postId)
        .populate('creator')
        .then(
            post => {
                if (!post) {
                    const error = new Error('Cannot find post to edit');
                    error.statusCode = 404;
                    throw error;
                }

                if (post.creator._id.toString() !== req.userId) {
                    const error = new Error('Unauthorized.');
                    error.statusCode = 403;
                    throw error;
                }

                if (post.imageUrl !== imageUrl) {
                    deleteImageFromStorage(post.imageUrl, next);
                }

                post.title = title;
                post.content = content;
                post.imageUrl = imageUrl;
                post.save().then(
                    result => {
                        io.getIO().emit(
                            'posts',
                            {
                                action: 'update',
                                post: result
                            }
                        );

                        return res.status(200).json({
                            message: 'post successfully updated',
                            post: result
                        });
                    }
                );
            }
        )
        .catch(err => errorHandler(err, next));
};

exports.deletePost = (req, res, next) => {
    const { params: { postId } } = req;

    Post.findById(postId)
        .then(
            post => {
                if (!post) {
                    const error = new Error('Post to delete not found');
                    error.statusCode = 404;
                    throw error;
                }

                // check if logged in user created the post
                if (post.creator.toString() !== req.userId) {
                    const error = new Error('Not Authorized');
                    error.statusCode = 403;
                    throw error;
                }

                deleteImageFromStorage(post.imageUrl, next);
                return Post.findByIdAndDelete(postId);
            }
        )
        .then(
            () => {
                return User.findById(req.userId);
            }
        )
        .then(
            loadedUser => {
                if (!loadedUser) {
                    const error = new Error('User Not Found.');
                    error.statusCode = 404;
                    throw error;
                }

                // Mongoose gives a pull(id) to remove objects
                loadedUser.posts.pull(postId);

                return loadedUser.save();
            }
        )
        .then(
            () => {
                io.getIO().emit('posts', {
                    action: 'delete',
                    post: postId
                });
                return res.status(200).json({
                    message: 'Post deleted'
                });
            }
        )
        .catch(err => errorHandler(err, next));
};


function errorHandler(err, next) {
    // if unexpected error
    if (!err.statusCode) {
        err.statusCode = 500;
    }

    // need to use next() middleware because inside async code
    return next(err);
}