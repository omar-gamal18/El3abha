const { Router } = require("express");

const {
  signup,
  login,
  forgotPassword,
  verifyPassResetCode,
  resetPassword,
  logout,
  refresh,
} = require("../controllers/auth.controller.js");

const {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  verifyResetCodeValidator,
  resetPasswordValidator,
} = require("../validators/auth.validator");

const { protect } = require("../middleware/auth.middleware.js");

const router = Router();

router.post("/signup", registerValidator, signup);
router.post("/login", loginValidator, login);

router.post("/forgotPassword", forgotPasswordValidator, forgotPassword);
router.post("/verifyResetCode", verifyResetCodeValidator, verifyPassResetCode);
router.post("/resetPassword", resetPasswordValidator, resetPassword);

router.post("/refresh", refresh);
router.post("/logout", protect, logout);

module.exports = router;
