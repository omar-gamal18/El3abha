/**
 * Represents an application error with an HTTP status.
 * @param {string} message response error message
 * @param {number} statusCode HTTP status, default 500
 * @returns {AppError} application error
 * @throws {never}
 */
class AppError extends Error {
  /**
   * Constructs an application error.
   * @param {string} message response error message
   * @param {number} statusCode HTTP status, default 500
   * @returns {AppError} application error
   * @throws {never}
   */
  constructor(message, statusCode = 500) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = statusCode < 500;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
