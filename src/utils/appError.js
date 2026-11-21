const MESSAGES = Object.freeze({
  INVALID_TOKEN: 'Session is no longer valid',
  REFRESH_TOKEN_MISSING: 'Refresh token not found',
  REFRESH_TOKEN_INVALID: 'Invalid or expired refresh token',
  RESET_TOKEN_MISSING: 'Reset session expired. Please verify your code again',
  RESET_TOKEN_INVALID: 'Invalid or expired reset session',
  RESET_CODE_INVALID: 'Invalid or expired reset code',
});

/**
 * Application error carrying an HTTP status and cookie-clearing policy.
 * Operational errors (status below 500) are safe to show to the client.
 * Use the static factories for token and reset-token failures.
 */
class AppError extends Error {
  /**
   * Constructs an application error.
   * @param {string} message response error message
   * @param {number} statusCode HTTP status, default 500
   * @param {{clearRefreshCookie?: boolean, clearResetCookie?: boolean}} options cookie-clearing policy
   * @returns {AppError} application error
   * @throws {never}
   */
  constructor(
    message,
    statusCode = 500,
    { clearRefreshCookie = false, clearResetCookie = false } = {},
  ) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = statusCode < 500;
    this.clearRefreshCookie = clearRefreshCookie;
    this.clearResetCookie = clearResetCookie;

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Creates a 401 error for a refresh token that is unknown, revoked, reused, or expired.
   * @returns {AppError} error that clears the refresh cookie
   * @throws {never}
   */
  static invalidToken() {
    return new AppError(MESSAGES.INVALID_TOKEN, 401, {
      clearRefreshCookie: true,
    });
  }

  /**
   * Creates a 401 error when no refresh cookie was sent.
   * @returns {AppError} refresh-cookie-missing error
   * @throws {never}
   */
  static refreshTokenMissing() {
    return new AppError(MESSAGES.REFRESH_TOKEN_MISSING, 401);
  }

  /**
   * Creates a 401 error for an invalid refresh JWT.
   * @returns {AppError} error that clears the refresh cookie
   * @throws {never}
   */
  static refreshTokenInvalid() {
    return new AppError(MESSAGES.REFRESH_TOKEN_INVALID, 401, {
      clearRefreshCookie: true,
    });
  }

  /**
   * Creates a 409 error for a refresh retry inside the grace window.
   * @returns {AppError} retry error that preserves the refresh cookie
   * @throws {never}
   */
  static refreshRetry() {
    return new AppError(MESSAGES.INVALID_TOKEN, 409);
  }

  /**
   * Creates a 400 error when no reset cookie was sent.
   * @returns {AppError} reset-cookie-missing error
   * @throws {never}
   */
  static resetTokenMissing() {
    return new AppError(MESSAGES.RESET_TOKEN_MISSING, 400);
  }

  /**
   * Creates a 400 error for an invalid reset token and marks its cookie for clearing.
   * @returns {AppError} error that clears the reset cookie
   * @throws {never}
   */
  static invalidResetToken() {
    return new AppError(MESSAGES.RESET_TOKEN_INVALID, 400, {
      clearResetCookie: true,
    });
  }

  /**
   * Creates the generic 400 error for any reset-code failure.
   * @returns {AppError} reset-code error
   * @throws {never}
   */
  static invalidResetCode() {
    return new AppError(MESSAGES.RESET_CODE_INVALID, 400);
  }
}

AppError.MESSAGES = MESSAGES;

module.exports = AppError;
