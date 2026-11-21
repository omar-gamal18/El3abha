const { rateLimit } = require("express-rate-limit");

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: "Too many password reset requests. Please try again later.",
    },
  },
});

module.exports = { forgotPasswordLimiter };
