const INVALID_TOKEN_MESSAGE = 'Session is no longer valid';

class AuthError extends Error {
  constructor(message, statusCode = 401, { clearCookie = false } = {}) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.clearCookie = clearCookie;

    Error.captureStackTrace(this, this.constructor);
  }

  static invalidToken(message = INVALID_TOKEN_MESSAGE) {
    return new AuthError(message, 401, { clearCookie: true });
  }
}

AuthError.INVALID_TOKEN_MESSAGE = INVALID_TOKEN_MESSAGE;

module.exports = AuthError;
