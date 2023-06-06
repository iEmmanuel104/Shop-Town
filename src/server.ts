import express, { Request, Response, NextFunction } from 'express';
import db from './models';
import cors, { CorsOptions } from 'cors';
// // import csrf from 'csurf';
// import xss from 'xss-clean';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import notFoundMiddleware from './app/middlewares/not-found';
import errorMiddleware from './app/middlewares/error-handler';
import authmiddleware from './app/middlewares/authMiddleware';
import cookieParser from 'cookie-parser';
import { logger, requestLogger } from './lib/logger'
import expressWinston from 'express-winston';
import dotenv from 'dotenv';

// Routes
import {
  auth, user, split, product, artist, asset, payment, expense, revenue, royalty, accounting, File, tenant, goadmin, checklist
} from './lib/app';
const { requestTenant, basicAuth } = authmiddleware;
dotenv.config();

const app = express();

app.use(expressWinston.logger({
  winstonInstance: requestLogger,
  statusLevels: true
}))

expressWinston.requestWhitelist.push('body')
expressWinston.responseWhitelist.push('body')

const whitelist = ['https://royalti.io', 'http://127.0.0.1:8080', 'https://server-dot-royalti-project.uc.r.appspot.com' ]; // list of allow domain

const corsOptions: CorsOptions = {  
  origin: (origin: string | undefined, callback: Function) => {
    console.log(origin, "cors")
    if (whitelist.indexOf(origin!) ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200,
  credentials: true, // enable set cookie
};


app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(helmet());
// app.use(xss());
app.use(mongoSanitize());
// // app.use(csrf({ cookie: true}));
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// // Express body parser
// app.use(express.urlencoded({ limit: '1000000mb', extended: true }));
// app.use(express.json({ limit: '1000000mb', extended: true }));
app.use(cookieParser());

// Request logger middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  requestLogger.warn({
    message: `Incoming request: ${req.method} ${req.path}`,
  });
  next();
});

const env = process.env.NODE_ENV;
// Test the db connection
db.sequelize
  .authenticate()
  .then(() => {
    logger.info(`Postgres connection has been established successfully -- ${process.env.NODE_ENV}`);
  })
  .catch((err: Error) => {
    logger.error(`Unable to connect to the database: ${err.message}`);
    if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError') {
      logger.error('The database is disconnected. Please check the connection and try again.');
    } else {
      logger.error(`An error occurred while connecting to the database: ${err.message}`);
    }
  });

// simple route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to ROYALTI API.' });
});



app.use('/auth', auth);
app.use('/goadmin', goadmin);
app.use('/tenant', tenant);
app.use('/user', basicAuth,  user);
app.use('/product', basicAuth, product)
app.use('/artist', basicAuth, artist)
app.use('/asset', basicAuth, asset)
app.use('/payment', basicAuth, payment)
app.use('/expense', basicAuth, expense)
app.use('/revenue', basicAuth, revenue)
app.use('/file', basicAuth, File)
app.use('/royalty', basicAuth, royalty)
app.use('/accounting', basicAuth, accounting)
app.use('/split', basicAuth, split)
app.use('/checklist', basicAuth, checklist)

app.use(notFoundMiddleware);
app.use(errorMiddleware);

app.use((req: Request, res: Response, next: NextFunction) => {
    res.status(404).json({
        status: 'fail',
        message: `Can't find ${req.originalUrl} on this server!`,
    });
});

let PORT: number | string = process.env.PORT || 8081;
let drop: { force?: boolean } | undefined;

if (process.env.NODE_ENV === 'test') {
    // PORT = process.env.TEST_PORT;
    drop = { force: true };
};

// sdding {force: true} will drop the table if it already exists
db.sequelize.sync(drop).then(() => {
    console.log('Dropped all tables: All models were synchronized successfully');
    // console.log(db)
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}........`);
    });
});

export default app;