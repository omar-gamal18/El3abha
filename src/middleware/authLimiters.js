const { rateLimit } = require('express-rate-limit');

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

exports.loginLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  'Too many login attempts. Please try again later.',
);
exports.forgotPasswordLimiter = createLimiter(
  60 * 60 * 1000,
  3,
  'Too many password reset requests. Please try again later.',
);
exports.verifyResetCodeLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  'Too many reset-code attempts. Please try again later.',
);
exports.refreshLimiter = createLimiter(
  15 * 60 * 1000,
  30,
  'Too many refresh requests. Please try again later.',
);
exports.resetPasswordLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  'Too many password reset attempts. Please try again later.',
);
