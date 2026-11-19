const { Router } = require("express");
const {
  signup,
  login,
  forgotPassword,
} = require("../controllers/auth.controller.js");

const { protect } = require("../middleware/auth.middleware.js");

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/forgotPassword", protect, forgotPassword);

module.exports = router;
