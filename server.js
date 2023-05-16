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

require('dotenv').config();
require('./app/utils/passport.configs')(passport);

let whitelist = ['https://royalti.io']

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
let count = 1;

showlogs = (req, res, next) => {
    console.log("\n==============================")
    // console.log(`------------>  ${count++}`)

    // console.log(`\n req.session.passport -------> `)
    // console.log(req.session.passport)

    // console.log(`\n req.user -------> `)
    // console.log(req.body)

    console.log("\n Session and Cookie")
    console.log(`req.session.id -------> ${req.session.id}`)
    console.log(`req.session.cookie -------> `)
    console.log(req.session.cookie)

    console.log("===========================================\n")
    next();
}

app.use(showlogs);

// serve public files
app.use(express.static('public'));

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
const auth = require('./app/routes/authRoutes'),
    brand = require('./app/routes/brandRoutes'),
    category = require('./app/routes/categoryRoutes'),
    cart = require('./app/routes/cartRoutes'),
    deliveryAddress = require('./app/routes/addressRoutes'),
    product = require('./app/routes/productRoutes');
    // order = require('./app/routes/orderRoutes');
    
app.use('/auth', auth);
app.use('/brand', brand);
app.use('/category', category);
app.use('/product', product);
app.use('/cart', cart);
app.use('/address', deliveryAddress);
// app.use('/order', order);

app.use(errorHandler);
app.use(notFoundMiddleware);
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
    drop = { force: true };
};

// sdding {force: true} will drop the table if it already exists
db.sequelize.sync().then(() => {
    console.log('Dropped all tables: All models were synchronized successfully');
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}........`);
    }
    );
});

module.exports = app;