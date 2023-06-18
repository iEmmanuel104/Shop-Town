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
const errorHandler = require('./app/middlewares/error-handler.js');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const sessionStore = new SequelizeStore({ db: db.sequelize });
const { serverAdapter } = require('./app/services/task.schedule.service');

require('dotenv').config();
require('./app/utils/passport.configs')(passport);

let whitelist = ['http://localhost:8082']

var corsOptions = {
    origin: (origin, callback) => {
        if (whitelist.indexOf(origin)) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    },
    optionsSuccessStatus: 200,
    credentials: true // enable set cookie
}

app.use(cors(corsOptions));
// app.use(cors());
app.use(morgan('dev'));
app.use(helmet());
app.use(xss());
app.use(mongoSanitize());
// app.use(csrf({ cookie: true}));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Express body parser
app.use(express.urlencoded({ extended: true }))
app.use(express.json({ extended: true }))
app.use(cookieParser())
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'secret',
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
        }
    })
);

app.use(passport.initialize());
app.use(passport.session());

// log the request session
// let count = 1;

// showlogs = (req, res, next) => {
//     console.log("\n==============================")
//     // console.log(`------------>  ${count++}`)

//     // console.log(`\n req.session.passport -------> `)
//     // console.log(req.session.passport)

//     // console.log(`\n req.user -------> `)
//     // console.log(req.body) 

//     console.log("\n Session and Cookie")
//     console.log(`req.session.id -------> ${req.session.id}`)
//     console.log(`req.session.cookie -------> `)
//     console.log(req.session.cookie)

//     console.log("=================================\n")
//     next();
// } 
// app.use(showlogs); 

// serve public files
app.use(express.static('public'));

const env = process.env.NODE_ENV;

// simple route
app.get("/", (req, res) => {
    res.json({ message: "Welcome to EZCART API." });
});

// // Routes
app.use('/auth', require('./app/routes/authRoutes'))
app.use('/brand', require('./app/routes/brandRoutes'))
app.use('/category', require('./app/routes/categoryRoutes'))
app.use('/product', require('./app/routes/productRoutes'))
app.use('/cart', require('./app/routes/cartRoutes'))
app.use('/address', require('./app/routes/addressRoutes'));
app.use('/order', require('./app/routes/orderRoutes'));
app.use('/post', require('./app/routes/ksocialRoutes'));
app.use('/wallet', require('./app/routes/walletRoutes'));


// bull-board
app.use('/admin/queues', serverAdapter.getRouter());

app.use(errorHandler);
app.use(notFoundMiddleware);
app.use((req, res, next) => {
    res.status(404).json({
        status: 'fail',
        message: `Can't find ${req.originalUrl} on this server!`,
    });
});


module.exports = app;