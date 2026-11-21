const { ipKeyGenerator, rateLimit } = require('express-rate-limit');
const {
  FORGOT_PASSWORD_RATE_LIMIT,
  FORGOT_PASSWORD_RATE_WINDOW_MS,
  LOGIN_RATE_WINDOW_MS,
  LOGIN_RATE_LIMIT,
  REFRESH_RATE_LIMIT,
  REFRESH_RATE_WINDOW_MS,
  RESET_PASSWORD_RATE_LIMIT,
  RESET_PASSWORD_RATE_WINDOW_MS,
  VERIFY_RESET_CODE_RATE_LIMIT,
  VERIFY_RESET_CODE_RATE_WINDOW_MS,
} = require('../config/authConstants');

/**
 * Creates an IP-keyed authentication rate limiter.
 * @param {number} windowMs limiter window in milliseconds
 * @param {number} limit maximum requests per key
 * @param {string} message rate-limit response message
 * @returns {Function} Express rate-limit middleware
 * @throws {Error} if limiter configuration is invalid
 */
const createLimiter = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      error: { message },
    },
  });

/**
 * Builds the normalized email portion of an email rate-limit key.
 * @param {import('express').Request} req Express request
 * @returns {string} trimmed lowercase email value
 * @throws {never}
 */
const emailKey = (req) => String(req.body?.email ?? '').trim().toLowerCase();

/**
 * Limits login attempts per client IP.
 * @returns {Function} Express rate-limit middleware
 * @throws {Error} if limiter configuration is invalid
 */
exports.loginLimiter = createLimiter(
  LOGIN_RATE_WINDOW_MS,
  LOGIN_RATE_LIMIT,
  'Too many login attempts. Please try again later.',
);

/**
 * Limits forgot-password requests per client IP.
 * @returns {Function} Express rate-limit middleware
 * @throws {Error} if limiter configuration is invalid
 */
exports.forgotPasswordLimiter = createLimiter(
  FORGOT_PASSWORD_RATE_WINDOW_MS,
  FORGOT_PASSWORD_RATE_LIMIT,
  'Too many password reset requests. Please try again later.',
);

/**
 * Limits forgot-password requests per normalized email key.
 * @returns {Function} Express rate-limit middleware
 * @throws {Error} if limiter configuration is invalid
 */
exports.forgotPasswordEmailLimiter = rateLimit({
  windowMs: FORGOT_PASSWORD_RATE_WINDOW_MS,
  limit: FORGOT_PASSWORD_RATE_LIMIT,
  keyGenerator: (req) => `email:${emailKey(req)}`,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many password reset requests. Please try again later.',
    },
  },
});

/**
 * Limits login requests by normalized email and IP.
 * @returns {Function} Express rate-limit middleware
 * @throws {Error} if limiter configuration is invalid
 */
exports.loginEmailLimiter = rateLimit({
  windowMs: LOGIN_RATE_WINDOW_MS,
  limit: LOGIN_RATE_LIMIT,
  keyGenerator: (req) =>
    `login:${emailKey(req)}:${ipKeyGenerator(req.ip)}`,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many login attempts. Please try again later.' },
  },
});

/**
 * Limits reset-code verification attempts per client IP.
 * @returns {Function} Express rate-limit middleware
 * @throws {Error} if limiter configuration is invalid
 */
exports.verifyResetCodeLimiter = createLimiter(
  VERIFY_RESET_CODE_RATE_WINDOW_MS,
  VERIFY_RESET_CODE_RATE_LIMIT,
  'Too many reset-code attempts. Please try again later.',
);

/**
 * Limits refresh requests per client IP.
 * @returns {Function} Express rate-limit middleware
 * @throws {Error} if limiter configuration is invalid
 */
exports.refreshLimiter = createLimiter(
  REFRESH_RATE_WINDOW_MS,
  REFRESH_RATE_LIMIT,
  'Too many refresh requests. Please try again later.',
);

/**
 * Limits reset-password attempts per client IP.
 * @returns {Function} Express rate-limit middleware
 * @throws {Error} if limiter configuration is invalid
 */
exports.resetPasswordLimiter = createLimiter(
  RESET_PASSWORD_RATE_WINDOW_MS,
  RESET_PASSWORD_RATE_LIMIT,
  'Too many password reset attempts. Please try again later.',
);
