const jwt = require('jsonwebtoken');

const secret = require('../utils/secret');

module.exports = (req, res, next) => {
    const authHeader = req.get('Authorization');

    if (!authHeader) {
        const error = new Error('Not Authenticated');
        error.statusCode = 401;
        throw error;
    }

    const token = authHeader.split(' ')[1];

    let decodedToken;
    try {
        // decodes and verifies the token
        decodedToken = jwt.verify(
            token,
            secret
        );
    } catch (error) {
        error.statusCode = 500;
        throw error;
    }

    // case: decoded but not verified
    if (!decodedToken) {
        const error = new Error('Not Authenticated');
        error.statusCode = 401;
        throw error;
    }

    // store userId in request
    req.userId = decodedToken.userId;
    next();
};
