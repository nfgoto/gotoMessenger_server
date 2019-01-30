exports.getPosts = (req, res, next) => {
    return res
        .status(200)
        .json({
            posts: [{ title: 'El Primer Post', content: 'Soy un post.' }]
        });
};

exports.postPost = (req, res, next) => {
    const { title, content } = req.body;
    
    return res
        .status(201)
        .json({
            message: 'Post created succesfully',
            post: {
                id: Date.now(),
                title: title.trim(),
                content: content.trim()
            }
        });
};