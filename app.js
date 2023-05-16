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
const passport = require('passport');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);

require('dotenv').config();

// app.use((req, res, next) => {
//   console.log('Request from origin:', req.headers.origin)
//   next()
// })

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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Express body parser
app.use(express.urlencoded({ limit: '1000000mb', extended: true }))
app.use(express.json({ limit: '1000000mb', extended: true }))
app.use(cookieParser())
const sessionStore = new SequelizeStore({ db: sequelize });
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'secret',
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
    })
);
// simple route
app.get("/", (req, res) => {
    res.json({ message: "Welcome to EZCART API." });
});

// // Routes
const auth = require('./app/routes/authRoutes'),
    brand = require('./app/routes/brandRoutes'),
    category = require('./app/routes/categoryRoutes'),
    product = require('./app/routes/productRoutes'),
    cart = require('./app/routes/cartRoutes'),
    order = require('./app/routes/orderRoutes');



app.use('/auth', auth);
app.use('/brand', brand);
app.use('/category', category);
app.use('/product', product);
app.use('/cart', cart);
app.use('/order', order);



app.use(notFoundMiddleware);
app.use(errorMiddleware);
app.use((req, res, next) => {
    res.status(404).json({
        status: 'fail',
        message: `Can't find ${req.originalUrl} on this server!`,
    });
});