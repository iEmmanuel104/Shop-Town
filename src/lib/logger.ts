import winston, {format} from 'winston';
import { LoggingWinston } from '@google-cloud/logging-winston';
import configs from '../app/utils/config'
const { PROJECT_ID } = configs

const loggingWinston = new LoggingWinston({
    projectId:  PROJECT_ID
});

let loggerTransports: winston.transport[];
let requestLoggerTransports: winston.transport[];

if (process.env.NODE_ENV === 'production') {

    loggerTransports= [
        new winston.transports.Console({
            level: 'info',
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        loggingWinston
    ];

    requestLoggerTransports = [

        new winston.transports.File({
            
            level: 'warn',
            filename: `${process.cwd()}/src/lib/logs/requestWarnings.log`
        }),
        new winston.transports.File({
            level: 'error',
            filename: `${process.cwd()}/src/lib/logs/requestErrors.log`
        })
    ];
} else {
    loggerTransports= [

        new winston.transports.File({
            level: 'info',
            filename: `${process.cwd()}/src/lib/logs/info.log`
        }),
    ];

   requestLoggerTransports= [

        new winston.transports.File({
            level: 'warn',
            filename: `${process.cwd()}/src/lib/logs/requestWarnings.log`
        }),
        new winston.transports.File({
            level: 'error',
            filename: `${process.cwd()}/src/lib/logs/requestErrors.log`
        })
    ];
}


const logger = winston.createLogger({
    level: 'info',
    transports: loggerTransports,
        format: format.combine(
        format.timestamp(),
        format.json(),
        format.prettyPrint()
    )
});

const requestLogger = winston.createLogger({
    level: 'warn',
    transports: requestLoggerTransports,
        format: format.combine(
        format.timestamp(),
        format.json(),
        format.prettyPrint()
    )
});

export { logger, requestLogger };
