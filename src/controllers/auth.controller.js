const authService = require('../services/auth.service');
const AuthError = require('../utils/authError');
const cookies = require('../utils/authCookies');
const { sendSuccess } = require('../utils/apiResponse');
const {
  REFRESH_COOKIE_NAME,
  RESET_COOKIE_NAME,
} = require('../config/authConstants');

/**
 * @route POST /api/v1/auth/signup
 * @body {string} name
 * @body {string} email
 * @body {string} phone
 * @body {string} password
 * @sets refresh_token cookie
 * @returns 201 User created successfully
 */
exports.signup = async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.signup(
    req.body,
  );
  cookies.setRefreshCookie(res, refreshToken);

  return sendSuccess(
    res,
    { user, token: accessToken },
    'User created successfully',
    201,
  );
};

/**
 * @route POST /api/v1/auth/login
 * @body {string} email
 * @body {string} password
 * @sets refresh_token cookie
 * @returns 200 User logged in successfully
 */
exports.login = async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(
    req.body,
  );
  cookies.setRefreshCookie(res, refreshToken);

  return sendSuccess(
    res,
    { user, token: accessToken },
    'User logged in successfully',
    200,
  );
};

/**
 * @route POST /api/v1/auth/logout
 * @cookie refresh_token
 * @returns 204
 */
exports.logout = async (req, res) => {
  await authService.logout(req.cookies?.[REFRESH_COOKIE_NAME]);
  cookies.clearRefreshCookie(res);
  return res.status(204).send();
};

/**
 * @route POST /api/v1/auth/refresh
 * @cookie refresh_token
 * @sets refresh_token cookie
 * @returns 200 Token refreshed successfully
 * @throws 401 invalid or expired token
 * @throws 409 refresh retry within the grace window
 */
exports.refresh = async (req, res) => {
  try {
    const { accessToken, refreshToken } = await authService.rotateRefreshToken(
      req.cookies?.[REFRESH_COOKIE_NAME],
    );
    cookies.setRefreshCookie(res, refreshToken);

    return sendSuccess(
      res,
      { token: accessToken },
      'Token refreshed successfully',
      200,
    );
  } catch (error) {
    if (error instanceof AuthError && error.clearCookie) {
      cookies.clearRefreshCookie(res);
    }
    throw error;
  }
};

/**
 * @route POST /api/v1/auth/forgotPassword
 * @body {string} email normalized by the validator
 * @clears resetToken cookie
 * @returns 200 If an account exists, a reset code has been sent.
 */
exports.forgotPassword = async (req, res) => {
  cookies.clearResetCookie(res);
  const response = sendSuccess(
    res,
    null,
    'If an account exists, a reset code has been sent.',
    200,
  );

  void authService.forgotPassword(req.body.email);
  return response;
};

/**
 * @route POST /api/v1/auth/verifyResetCode
 * @body {string} email normalized by the validator
 * @body {string|number} resetCode
 * @sets resetToken cookie
 * @returns 200 Reset code verified
 * @throws 400 invalid or expired reset code
 */
exports.verifyPassResetCode = async (req, res) => {
  const resetToken = await authService.verifyPasswordResetCode(req.body);
  cookies.setResetCookie(res, resetToken);
  return sendSuccess(res, null, 'Reset code verified', 200);
};

/**
 * @route POST /api/v1/auth/resetPassword
 * @body {string} newPassword
 * @cookie resetToken
 * @clears resetToken and refresh_token cookies
 * @returns 200 Password changed successfully
 */
exports.resetPassword = async (req, res) => {
  try {
    await authService.resetPassword(
      req.body.newPassword,
      req.cookies?.[RESET_COOKIE_NAME],
    );
  } catch (error) {
    if (error.clearResetCookie) cookies.clearResetCookie(res);
    throw error;
  }
  cookies.clearResetCookie(res);
  cookies.clearRefreshCookie(res);
  return sendSuccess(res, null, 'Password changed successfully', 200);
};
