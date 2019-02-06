require('dotenv').config()

const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { multer, fileStorage, fileFilter } = require("./middlewares/multerHelper");


const feedRoutes = require('./routers/feeds');
const authRoutes = require('./routers/auth');

const PORT = 8000;
const app = express();

// to parse incoming JSON data
app.use(bodyParser.json());

app.use(multer({ storage: fileStorage, fileFilter }).single('image'));

app.use('/images', express.static(path.join(__dirname, '..', 'images')));

// CORS handling middleware
app.use(
    (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', '*');
        next();
    }
);

app.use('/feed', feedRoutes);
app.use('/auth', authRoutes);

// error handling middleware
app.use(
    (error, req, res, next) => {
        const { message, statusCode = 500, data } = error;

        console.log(error)
        return res.status(statusCode).json({ message, data });
    }
);

mongoose.connect(process.env.MONGO_URI).then(
    () => {
        const server = app.listen(
            PORT,
            () => {
                console.log(`Express server up and running on port ${PORT}`);
            }
        );

        // built the socket on the HTTP server
        const io = require('./socket').init(server);

        io.on(
            'connection',
            // socket arg is the connetion between our server and the client
            (socket) => {
                console.log('Client connected via Web Socket !');
            }
        )

    }
).catch(err => { console.log(err) })
