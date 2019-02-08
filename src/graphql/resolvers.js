const bcrypt = require('bcryptjs');
const validator = require('validator');

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
            !validator.isLength(password,{ min: 5 })
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

    hello: () => 'helllo !!!!!!!!!!!!!!'
};