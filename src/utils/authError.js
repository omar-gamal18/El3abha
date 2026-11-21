const INVALID_TOKEN_MESSAGE = 'Session is no longer valid';

/**
 * Represents authentication-token failures and cookie-clearing policy.
 * @param {string} message response error message
 * @param {number} statusCode HTTP status
 * @param {{clearCookie?: boolean}} options refresh-cookie handling
 * @returns {AuthError} authentication error
 * @throws {never}
 */
class AuthError extends Error {
  /**
   * Constructs an authentication error.
   * @param {string} message response error message
   * @param {number} statusCode HTTP status, default 401
   * @param {{clearCookie?: boolean}} options refresh-cookie handling
   * @returns {AuthError} authentication error
   * @throws {never}
   */
  constructor(message, statusCode = 401, { clearCookie = false } = {}) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.clearCookie = clearCookie;

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Creates a 401 invalid-token error that clears the refresh cookie.
   * @param {string} message error message
   * @returns {AuthError} 401 authentication error
   * @throws {never}
   */
  static invalidToken(message = INVALID_TOKEN_MESSAGE) {
    return new AuthError(message, 401, { clearCookie: true });
  }
}

AuthError.INVALID_TOKEN_MESSAGE = INVALID_TOKEN_MESSAGE;

module.exports = AuthError;
