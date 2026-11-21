const { Router } = require('express');
const {
  signup,
  login,
  forgotPassword,
  verifyPassResetCode,
  resetPassword,
  refresh,
  logout,
} = require('../controllers/auth.controller.js');

const { protect } = require('../middleware/auth.middleware.js');
const {
  forgotPasswordLimiter,
  forgotPasswordEmailLimiter,
  loginLimiter,
  loginEmailLimiter,
  refreshLimiter,
  resetPasswordLimiter,
  verifyResetCodeLimiter,
} = require('../utils/authLimiters.js');
const {
  validateForgotPassword,
  validateLogin,
  validateResetPassword,
  validateSignup,
  validateVerifyResetCode,
} = require('../utils/validators/authValidators.js');

const router = Router();

router.post('/signup', validateSignup, signup);
router.post('/login', loginLimiter, validateLogin, loginEmailLimiter, login);
router.post(
  '/forgotPassword',
  forgotPasswordLimiter,
  validateForgotPassword,
  forgotPasswordEmailLimiter,
  forgotPassword,
);
router.post(
  '/verifyResetCode',
  verifyResetCodeLimiter,
  validateVerifyResetCode,
  verifyPassResetCode,
);
router.post(
  '/resetPassword',
  resetPasswordLimiter,
  validateResetPassword,
  resetPassword,
);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);

module.exports = router;
