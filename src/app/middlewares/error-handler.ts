// const { CustomAPIError } = require('../utilS/customErrors')

// const handleDuplicateKey = (err) => {
//   const errKeyValue = err.keyValue.email
//   const message = `${errKeyValue} already exists please user another email`
//   return new CustomAPIError(message, 400)
// }

// const handleValidationErr = (err) => {
//   console.log(err)

//   const errPath = Object.values(err.errors).map((el) => el.message)
//   const message = `${errPath}, Try again`
//   return new CustomAPIError(message, 400)
// }

// const errorHandler = (err, req, res, next) => {
//   console.log(err)
//   if (process.env.NODE_ENV != 'test') {
//   }

//   //Send Operational Errors We Trust To Client
//   let error = { ...err }
//   // if (error.code == 11000) error = handleDuplicateKey(error)
//   if (error.name == 'SequelizeValidationError') error = handleValidationErr(error)
//   if (error instanceof CustomAPIError || err instanceof CustomAPIError) {
//     return res
//       .status(error.statusCode || err.statusCode)
//       .send({
//         error: {
//           status: error.statusCode,
//           message: error.message || err.message
//         }
//       })
//   } else {
//     if (error.name == 'TokenExpiredError') {
//       return res.status(401).send({
//         error: {
//           status: 401,
//           message: 'Token Expired'
//         }
//       })
//     }
//     return res.status(500).send({
      // error: {
      //   status: error.statusCode,
      //   message: 'An error occurred'
      // }
//     })
//   }
// }

// module.exports = errorHandler

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../lib/logger';

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.log(err);
  // logger.error(err.message);
  let customError = {
    // set default
    statusCode: err.statusCode || 500,
    msg: err.message || 'Something went wrong, try again later',
  };
  if (err.name === 'ValidationError') {
    customError.msg = Object.values(err.errors)
      .map((item: any) => item.message)
      .join(',');
    customError.statusCode = 400;
  }
  if (err.code && err.code === 11000) {
    customError.msg = `Duplicate value entered for ${Object.keys(
      err.keyValue
    )} field, please choose another value`;
    customError.statusCode = 400;
  }
  if (err.name === 'CastError') {
    customError.msg = `No item found with id : ${err.value}`;
    customError.statusCode = 404;
  }
  // for sequelize errors
  if (err.name === 'SequelizeValidationError') {
    customError.msg = Object.values(err.errors)
      .map((item: any) => item.message)
      .join(',');
    customError.statusCode = 400;
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    customError.msg = Object.values(err.errors)
      .map((item: any) => item.message)
      .join(',');
    customError.statusCode = 400;
  }
  if (err.name === 'SequelizeDatabaseError') {
    customError.msg = err.message;
    customError.statusCode = 400;
  }

  if (customError.statusCode === 500) {
    return res.status(customError.statusCode).json({
      error: {
        status: customError.statusCode,
        message: 'An error occurred'
      }
    });
    
  }

  return res.status(customError.statusCode).json({ msg: customError.msg });
};

export default errorHandler;

