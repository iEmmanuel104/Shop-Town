const errorHandler = (err, req, res, next) => {

  let customError = {
    // set default
    statusCode: err.statusCode || 500,
    msg: err.message || 'Something went wrong, try again later',
  };
  if (err.name === 'ValidationError') {
    customError.msg = Object.values(err.errors)
      .map((item) => item.message)
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
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    customError.msg = 'Invalid token';
    customError.statusCode = 401;
  }
  // Handle Sequelize errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    const errorItem = err.errors[0] ? err.errors[0] : err.errors.ValidationErrorItem;
    customError.msg = errorItem ? errorItem.message : `The ${Object.keys(err.fields || {}).join(', ')} value provided has already been registered or taken`;
    customError.statusCode = 400;
  } else if (err.name === 'SequelizeValidationError') {
    customError.msg = err.errors.map((e) => e.message).join(', ');
    customError.statusCode = 400;
  }
  if (err.name === 'SequelizeDatabaseError') {
    customError.msg = err.message;
    customError.statusCode = 400;
  }
  // Handle Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    customError.msg = 'File size is too large. Max size is 1MB';
    customError.statusCode = 400;
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    customError.msg = 'Only images are allowed';
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

module.exports = errorHandler;