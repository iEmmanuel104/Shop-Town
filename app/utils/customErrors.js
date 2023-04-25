// custom errors for API
class CustomAPIError extends Error {
  constructor(message) {
    super(message)
  }
// return the error message as JSON with the status code
  serializeErrors() {
    return {
      message: this.message,
      statusCode: this.statusCode
    }
  }
}

class BadRequestError extends CustomAPIError {
  constructor(message) {
    super(message);
    this.statusCode = 400;
  }
  // response to the client
  serializeErrors() {
    return {
      message: this.message,
      statusCode: this.statusCode
    }
  }
}

class NotFoundError extends CustomAPIError {
  constructor(message) {
    super(message);
    this.statusCode = 404;
  }
}
class ForbiddenError extends CustomAPIError {
  constructor(message) {
    super(message);
    this.statusCode = 403;
  }
}

class UnauthorizedError extends CustomAPIError {
  constructor(message) {
    super(message);
    this.statusCode = 401;
  }
}

class InternalServerError extends CustomAPIError {
  constructor(message) {
    super(message);
    this.statusCode = 500;
  }
}

class ConflictError extends CustomAPIError {
  constructor(message) {
    super(message);
    this.statusCode = 409;
  }
}

class ServiceUnavailableError extends CustomAPIError {
  constructor(message) {
    super(message);
    this.statusCode = 503;
  }
}

class UnprocessableEntityError extends CustomAPIError {
  constructor(message) {
    super(message);
    this.statusCode = 422;
  }
}

class TooManyRequestsError extends CustomAPIError {
  constructor(message) {
    super(message);
    this.statusCode = 429;
  }
}

class GatewayTimeoutError extends CustomAPIError {
  constructor(message) {
    super(message);
    this.statusCode = 504;
  }
}

class BadGatewayError extends CustomAPIError {
  constructor(message) {
    super(message);
    this.statusCode = 502;
  }
}




module.exports = { 
  CustomAPIError,
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  InternalServerError,
  ConflictError,
  ServiceUnavailableError,
  UnprocessableEntityError,
  TooManyRequestsError,
  GatewayTimeoutError,
  BadGatewayError
}
