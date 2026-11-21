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

const emailKey = (req) => String(req.body?.email ?? '').trim().toLowerCase();

exports.loginLimiter = createLimiter(
  LOGIN_RATE_WINDOW_MS,
  LOGIN_RATE_LIMIT,
  'Too many login attempts. Please try again later.',
);
exports.forgotPasswordLimiter = createLimiter(
  FORGOT_PASSWORD_RATE_WINDOW_MS,
  FORGOT_PASSWORD_RATE_LIMIT,
  'Too many password reset requests. Please try again later.',
);
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
exports.verifyResetCodeLimiter = createLimiter(
  VERIFY_RESET_CODE_RATE_WINDOW_MS,
  VERIFY_RESET_CODE_RATE_LIMIT,
  'Too many reset-code attempts. Please try again later.',
);
exports.refreshLimiter = createLimiter(
  REFRESH_RATE_WINDOW_MS,
  REFRESH_RATE_LIMIT,
  'Too many refresh requests. Please try again later.',
);
exports.resetPasswordLimiter = createLimiter(
  RESET_PASSWORD_RATE_WINDOW_MS,
  RESET_PASSWORD_RATE_LIMIT,
  'Too many password reset attempts. Please try again later.',
);
