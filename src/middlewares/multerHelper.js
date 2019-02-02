const express = require('express');
const multer = require("multer");


// storage engine
const fileStorage = multer.diskStorage({
    // set destination of uploaded file on server
    destination: (
        _req,
        _file,
        cb
    ) =>
        // will be stored in /images om the server
        cb(null, 'images'),

    // set a unique filename
    filename: (
        _req,
        file,
        cb
    ) =>
        cb(null, `${new Date().toISOString()}-${file.originalname}`)
});

// only allow certain type of files (security measure)
const fileFilter = (
    _req,
    file,
    cb
) => {
    switch (file.mimetype) {
        case 'image/png':
        case 'image/jpg':
        case 'image/jpg': {
            console.log('====== ACCEPTED FILE =============')
            // allow that kind of file to be uploaded to server
            cb(null, true);
            break;
        }

        default: {
            console.log('====== REJECTED FILE =============')

            // deny upload
            cb(null, false);
            break;
        }
    }
};

module.exports = {
    multer,
    fileStorage,
    fileFilter
};