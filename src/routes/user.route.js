const { Router } = require("express");
const {
  signup,
  login,
  forgotPassword,
  verifyPassResetCode,
  resetPassword,
  refresh,
  logout,
} = require("../controllers/auth.controller.js");

const { protect } = require("../middleware/auth.middleware.js");
const {
  forgotPasswordLimiter,
  loginLimiter,
  refreshLimiter,
  resetPasswordLimiter,
  verifyResetCodeLimiter,
} = require("../middleware/authLimiters.js");

const router = Router();

router.post("/signup", signup);
router.post("/login", loginLimiter, login);
router.post("/forgotPassword", forgotPasswordLimiter, forgotPassword);
router.post("/verifyResetCode", verifyResetCodeLimiter, verifyPassResetCode);
router.post("/resetPassword", resetPasswordLimiter, resetPassword);
router.post("/refresh", refreshLimiter, refresh);
router.post("/logout", logout);

module.exports = router;
