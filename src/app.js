const express = require('express');
const bodyParser = require('body-parser');

const feedRoutes = require('./routers/feeds');

const PORT = 8000;
const app = express();

// to parse incoming JSON data
app.use(bodyParser.json());

app.use(
    (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        next();
    }
);

app.use('/feed', feedRoutes);

app.listen(
    PORT,
    () => {
        console.log(`Express server up and running on port ${PORT}`);
    }
);