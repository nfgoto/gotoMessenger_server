require('dotenv').config();

const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const graphqlHttp = require('express-graphql');

const { multer, fileStorage, fileFilter } = require('./middlewares/multerHelper');
const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');
const auth = require('./middlewares/auth');

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
        // because GraphQL rejects requests that qre not GET or POST
        if (req.method === 'OPTIONS') {
            // send an empty success status to be able to receive the query
            // the OPTIONS req will stop here
            return res.sendStatus(200);
        }
        next();
    }
);

// auth middleware
app.use(auth);

// configure the graphql endpoint
app.use(
    '/graphql',
    graphqlHttp({
        schema: graphqlSchema,
        rootValue: graphqlResolver,

        // tool to access a web UI for graphql, need a query command to be able access it
        graphiql: true,

        // error handling in GraphQL
        formatError(err) {
            // originalError = error in dev code (set by GraphQL)
            if (!err.originalError) {
                return err;
            }
            const {
                data,
                message = 'An Error Has Occurred',
                code = 500
            } = err.originalError;

            return { message, data, status: code };
        }
    })
);

// custom error handling middleware
app.use(
    (error, req, res, next) => {
        //  handling streaming errors
        // https://expressjs.com/en/guide/error-handling.html#the-default-error-handler
        if (res.headersSent) {
            return next(error);
        }
        const { message, statusCode = 500, data } = error;

        return res.status(statusCode).json({ message, data });
    }
);

mongoose.connect(process.env.MONGO_URI).then(
    () => {
        app.listen(
            PORT,
            () => {
                /* eslint-disable */
                console.log(`Express server up and running on port ${PORT}`);
                /* eslint-enable */
            }
        );

    }
).catch(err => {
    /* eslint-disable */
    console.log(err.message);
    /* eslint-enable */
});
