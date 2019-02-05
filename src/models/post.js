const mongoose = require('mongoose');
const { Schema } = require('mongoose');

const postSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    creator: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
        // adds createdAt and updatedAt fields
        timestamps: true
    }
);

module.exports = mongoose.model('Post', postSchema);