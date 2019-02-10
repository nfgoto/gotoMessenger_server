const fs = require('fs');
const path = require('path');

module.exports = function deleteImageFromStorage(filetpath, next, cb) {
    fs.unlink(
        path.join(__dirname, '..', '..', filetpath),
        err => {
            if (err) return next(err);
            cb();
        }
    );
};