const fs = require('fs');
const path = require('path');

module.exports = function deleteImageFromStorage(filetpath, next) {
    fs.unlink(
        path.join(__dirname, '..', '..', filetpath),
        err => {
            if (err) next(err);
        }
    );
};