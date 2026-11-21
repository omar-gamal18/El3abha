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
const { forgotPasswordLimiter } = require("../middleware/rateLimit.middleware.js");

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/forgotPassword", forgotPasswordLimiter, forgotPassword);
router.post("/verifyResetCode", verifyPassResetCode);
router.post("/resetPassword", resetPassword);
router.post("/refresh", refresh);
router.post("/logout", logout);

module.exports = router;
