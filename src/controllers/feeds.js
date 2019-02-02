const { validationResult } = require('express-validator/check');

const Post = require('../models/post');

exports.getPosts = (_req, res, _next) => {
    Post.find()
        .then(
            posts => {
                if (!posts) {
                    const error = new Error('No posts found.');
                    error.statusCode = 404;
                    // we can throw because will reach the catch block and get to the error handling middleware
                    throw error;
                }

                return res
                    .status(200)
                    .json({
                        posts
                    });
            }
        )
        .catch(err => errorHandler(err, next))
};

exports.postPost = (req, res, next) => {
    const validationErrors = validationResult(req);
    
    if (!validationErrors.isEmpty()) {
        const error = new Error('Validation failed.');
        error.statusCode = 422;
        error.validationErrors = validationErrors.array();
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
        creator: {
            name: 'Florian'
        }
    });

    post.save()
        .then(result => {
            return res
                .status(201)
                .json({
                    message: 'Post created succesfully',
                    post: result
                });
        })
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
                ``
                return res.json({ message: 'post fetched', post });
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