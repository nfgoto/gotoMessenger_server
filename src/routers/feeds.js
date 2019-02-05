const express = require('express');
const { body } = require('express-validator/check');

const feedController = require('../controllers/feeds');
const isAuth = require('../middlewares/isAuth');

const router = express.Router();
const validationHandlers = [
    body('title').trim().isLength({ min: 5 }),
    body('content').trim().isLength({ min: 5 })
];

// GET /feed/posts
router.get(
    '/posts',
    isAuth,
    feedController.getPosts
);

// POST /feed/post
router.post(
    '/post',
    isAuth,
    validationHandlers,
    feedController.postPost
);

// GET /feed/post
router.get(
    '/post/:postId',
    isAuth,
    feedController.getPost
);

// PUT /feed/post/:postId
router.put(
    '/post/:postId',
    isAuth,
    validationHandlers,
    feedController.putPost
);

// DELETE /feed/post/:postId
router.delete(
    '/post/:postId',
    isAuth,
    feedController.deletePost
);

module.exports = router;