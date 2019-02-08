const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const User = require('../models/user');

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

    login: async (args, req) => {
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
        }
    }
};