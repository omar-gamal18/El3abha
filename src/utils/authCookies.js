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

exports.setRefreshCookie = (res, token) =>
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions);
exports.clearRefreshCookie = (res) =>
  res.clearCookie(REFRESH_COOKIE_NAME, { path: AUTH_COOKIE_PATH });
exports.setResetCookie = (res, token) =>
  res.cookie(RESET_COOKIE_NAME, token, resetCookieOptions);
exports.clearResetCookie = (res) =>
  res.clearCookie(RESET_COOKIE_NAME, { path: AUTH_COOKIE_PATH });
