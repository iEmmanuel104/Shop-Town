const express = require('express');
const db = require('./models');
const app = express();
const cors = require('cors');
// const csrf = require('csurf');
const xss = require('xss-clean');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const notFoundMiddleware = require('./app/middlewares/not-found.js');
const errorMiddleware = require('./app/middlewares/error-handler.js');
const cookieParser = require('cookie-parser');

// configure .env   

require('dotenv').config();

// app.use((req, res, next) => {
//   console.log('Request from origin:', req.headers.origin)
//   next()
// })

// let whitelist = ['https://royalti.io']

// var corsOptions = {
//     origin: (origin, callback) => {
//         if (whitelist.indexOf(origin)) {
//             callback(null, true)
//         } else {
//             callback(new Error('Not allowed by CORS'))
//         }
//     },
//     optionsSuccessStatus: 200,
//     credentials: true // enable set cookie
// }

// app.use(cors(corsOptions));
app.use(cors());
app.use(morgan('dev'));
app.use(helmet());
app.use(xss());
app.use(mongoSanitize());
// app.use(csrf({ cookie: true}));
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Express body parser
app.use(express.urlencoded({ limit: '1000000mb', extended: true }))
app.use(express.json({ limit: '1000000mb', extended: true }))
app.use(cookieParser())
// Create a Winston logger that streams to Stackdriver Logging.
// const winston = require('winston')
// const { LoggingWinston } = require('@google-cloud/logging-winston');
// const loggingWinston = new LoggingWinston()
// const logger = winston.createLogger({
//     level: 'info',
//     transports: [new winston.transports.Console(), loggingWinston],
// })

const env = process.env.NODE_ENV;
// Test the db connection
db.sequelize
    .authenticate()
    .then(() => {
        console.log('postgres connection has been established successfully. -- ' + env);
    })
    .catch((err) => {
        console.error('Unable to connect to the database:', err);
        if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError') {
            console.error('The database is disconnected. Please check the connection and try again.');
        } else {
            console.error('An error occured while connecting to the database:', err);
        }
    });


// simple route
app.get("/", (req, res) => {
    res.json({ message: "Welcome to EZCART API." });
});

// // Routes
// const auth = require('./app/routes/auth');
// const user = require('./app/routes/userRoutes');
// const split = require('./app/routes/splitRoutes');
// const product = require('./app/routes/productRoutes');
// const artist = require('./app/routes/artistRoutes');
// const asset = require('./app/routes/assetRoutes');
// const payment = require('./app/routes/paymentRoutes');
// const expense = require('./app/routes/expenseRoutes');
// const revenue = require('./app/routes/revenueRoutes');
// const royalty = require('./app/routes/royaltyRoutes');
// const accounting = require('./app/routes/accountingRoutes');
// const tenant = require('./app/routes/tenantRoutes');
// const goadmin = require('./app/routes/godminRoutes');

// app.use('/auth', auth);
// app.use('/goadmin', goadmin)
// app.use('/tenant', tenant);
// app.use('/user', requestTenant, user);
// app.use('/product', requestTenant, product)
// app.use('/artist', requestTenant, artist)
// app.use('/asset', requestTenant, asset)
// app.use('/payment', requestTenant, payment)
// app.use('/expense', requestTenant, expense)
// app.use('/revenue', requestTenant, revenue)
// app.use('/royalty', requestTenant, royalty)
// app.use('/accounting', requestTenant, accounting)
// app.use('/split', requestTenant, split)

app.use(notFoundMiddleware);
app.use(errorMiddleware);
app.use((req, res, next) => {
    res.status(404).json({
        status: 'fail',
        message: `Can't find ${req.originalUrl} on this server!`,
    });
});

let PORT = process.env.PORT;
let drop;

if (env === 'test') {
    PORT = process.env.TEST_PORT
    // drop = { force: true };
};

// sdding {force: true} will drop the table if it already exists
db.sequelize.sync(drop).then(() => {
    console.log('Dropped all tables: All models were synchronized successfully');
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}........`);
    }
    );
});

module.exports = app;