const express = require('express');
const { body } = require('express-validator/check')

const router = express.Router();
const authController = require('../controllers/auth');
const User = require('../models/user');

// PUT /auth/signup
router.put(
    '/signup',
    [
        body('name')
            .trim()
            .isLength({ min: 5 }),
        body('email')
            .isEmail()
            .withMessage('Please Enter a Valid Email')
            .custom(
                (value, { req }) => {
                    return User.findOne({
                        email: value
                    })
                        .then(
                            userDoc => {
                                if (userDoc) {
                                    return Promise.reject('Email Already Taken');
                                }
                                // implicit return Promise,resolve()
                            }
                        )
                }
            )
            .normalizeEmail({ gmail_remove_dots: false }),
        body('password')
            .trim()
            .not()
            .isEmpty()
    ],
    authController.putSignup
);

// POST /auth/login
router.post(
    '/login',
    [
        body('email', 'Please Enter a Valid Email')
            .isEmail()
            .normalizeEmail({ gmail_remove_dots: false }),
        body('password')
            .trim()
            .not()
            .isEmpty()
    ],
    authController.postLogin
)

module.exports = router;