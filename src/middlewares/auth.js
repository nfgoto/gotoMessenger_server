const jwt = require('jsonwebtoken');

const secret = require('../utils/secret');

module.exports = (req, res, next) => {
    const authHeader = req.get('Authorization');

    if (!authHeader) {
        req.isAuth = false;
        return next();
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
        req.isAuth = false;
        return next();
    }

    // case: decoded but not verified
    if (!decodedToken) {
        req.isAuth = false;
        return next();
    }

    // store userId in request
    req.userId = decodedToken.userId;
    req.isAuth = true;
    next();
};
