const { validationResult } = require('express-validator/check');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const secret = require('../utils/secret');

exports.putSignup = (req, res, next) => {
    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {
        const error = new Error('Signup Validation failed.');
        error.statusCode = 422;
        error.data = validationErrors.array();
        throw error;
    }

    const {
        email,
        password,
        name,
    } = req.body;

    bcrypt.hash(password, 12)
        .then(
            hashedPassword => {
                if (!hashedPassword) {
                    const error = new Error('Password hashing failed.');
                    throw error;
                }

                const user = new User({
                    email,
                    password: hashedPassword,
                    name
                });
                return user.save();
            }
        )
        .then(
            user => {
                if (!user) {
                    const error = new Error('User signup errpr');
                    throw error;
                }

                return res.status(201).json({
                    message: 'User Signup Successful',
                    user
                });
            }
        )
        .catch(err => errorHandler(err, next));
};

exports.postLogin = (req, res, next) => {
    const { email, password } = req.body;
    let loadedUser;

    // Does the email exist
    User.findOne({ email })
        .then(
            user => {
                if (!user) {
                    const error = new Error('User does not exist');
                    error.statusCode = 404;
                    throw error;
                }
                loadedUser = user;
                return bcrypt.compare(password, user.password);
            }
        )
        .then(
            passwordMatch => {
                if (!passwordMatch) {
                    const error = new Error('Invalid Password');
                    error.statusCode = 401;
                    throw error;
                }

                // generate JWT
                const jsonData = {
                    email: loadedUser.email,
                    userId: loadedUser._id.toString()
                    // do NOT set sensitive data because it is accessible in client
                };
                const token = jwt.sign(
                    jsonData,
                    secret,
                    {
                        expiresIn: '1h'
                    }
                );

                return res.status(200).json({
                    token,
                    userId: loadedUser._id.toString()
                });
            }
        )
        .catch(err => errorHandler(err, next));
};


// =========================================================

function errorHandler(err, next) {
    // if unexpected error
    if (!err.statusCode) {
        err.statusCode = 500;
    }

    // need to use next() middleware because inside async code
    return next(err);
}