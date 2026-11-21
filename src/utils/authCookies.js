const env = require('../config/env');
const {
  AUTH_COOKIE_PATH,
  DAY_MS,
  REFRESH_COOKIE_NAME,
  RESET_COOKIE_NAME,
  RESET_TOKEN_TTL_MS,
} = require('../config/authConstants');

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: AUTH_COOKIE_PATH,
  maxAge: env.refreshExpiresDays * DAY_MS,
};

const resetCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: AUTH_COOKIE_PATH,
  maxAge: RESET_TOKEN_TTL_MS,
};

/**
 * Sets the refresh-token cookie using the shared auth cookie policy.
 * @param {import('express').Response} res Express response
 * @param {string} token raw refresh JWT
 * @returns {import('express').Response} Express response
 * @throws {Error} if Express rejects cookie options; no HTTP status is assigned
 */
exports.setRefreshCookie = (res, token) =>
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions);

/**
 * Clears the refresh-token cookie at the auth route path.
 * @param {import('express').Response} res Express response
 * @returns {import('express').Response} Express response
 * @throws {Error} if Express rejects cookie options; no HTTP status is assigned
 */
exports.clearRefreshCookie = (res) =>
  res.clearCookie(REFRESH_COOKIE_NAME, { path: AUTH_COOKIE_PATH });

/**
 * Sets the password-reset cookie using the shared auth cookie policy.
 * @param {import('express').Response} res Express response
 * @param {string} token raw reset token
 * @returns {import('express').Response} Express response
 * @throws {Error} if Express rejects cookie options; no HTTP status is assigned
 */
exports.setResetCookie = (res, token) =>
  res.cookie(RESET_COOKIE_NAME, token, resetCookieOptions);

/**
 * Clears the password-reset cookie at the auth route path.
 * @param {import('express').Response} res Express response
 * @returns {import('express').Response} Express response
 * @throws {Error} if Express rejects cookie options; no HTTP status is assigned
 */
exports.clearResetCookie = (res) =>
  res.clearCookie(RESET_COOKIE_NAME, { path: AUTH_COOKIE_PATH });
