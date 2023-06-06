// custom errors for API
class CustomAPIError extends Error {
  public statusCode?: number;

  constructor(message: string) {
    super(message);
  }
  // return the error message as JSON with the status code
  public serializeErrors() {
    return {
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}

class BadRequestError extends CustomAPIError {
  constructor(message: string) {
    super(message);
    this.statusCode = 400;
  }
  // response to the client
  public serializeErrors() {
    return {
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}

class NotFoundError extends CustomAPIError {
  constructor(message: string) {
    super(message);
    this.statusCode = 404;
  }
}

class ForbiddenError extends CustomAPIError {
  constructor(message: string) {
    super(message);
    this.statusCode = 403;
  }
}

class UnauthorizedError extends CustomAPIError {
  constructor(message: string) {
    super(message);
    this.statusCode = 401;
  }
}

class InternalServerError extends CustomAPIError {
  constructor(message: string) {
    super(message);
    this.statusCode = 500;
  }
}

class ConflictError extends CustomAPIError {
  constructor(message: string) {
    super(message);
    this.statusCode = 409;
  }
}

class ServiceUnavailableError extends CustomAPIError {
  constructor(message: string) {
    super(message);
    this.statusCode = 503;
  }
}

class UnprocessableEntityError extends CustomAPIError {
  constructor(message: string) {
    super(message);
    this.statusCode = 422;
  }
}

class TooManyRequestsError extends CustomAPIError {
  constructor(message: string) {
    super(message);
    this.statusCode = 429;
  }
}

class GatewayTimeoutError extends CustomAPIError {
  constructor(message: string) {
    super(message);
    this.statusCode = 504;
  }
}

class BadGatewayError extends CustomAPIError {
  constructor(message: string) {
    super(message);
    this.statusCode = 502;
  }
}

class TokenExpiredError extends CustomAPIError {
  constructor(message: string) {
    super(message);
    this.statusCode = 401;
  }
}

class JsonWebTokenError extends CustomAPIError {
  constructor(message: string) {
    super(message);
    this.statusCode = 401;
  }
}

export default {
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
  BadGatewayError,
  TokenExpiredError,
  JsonWebTokenError,
};
