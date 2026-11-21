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

const { protect } = require("../middleware/auth.middleware.js");

const router = Router();

router.post("/signup", signup);
router.post("/login", login);

router.post("/forgotPassword", forgotPassword);
router.post("/verifyResetCode", verifyPassResetCode);
router.post("/resetPassword", resetPassword);

router.post("/refresh", refresh);
router.post("/logout", protect, logout);

module.exports = router;
