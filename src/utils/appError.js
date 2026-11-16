class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = statusCode < 500;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
