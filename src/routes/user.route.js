const { Router } = require("express");
const { signup } = require("../controllers/auth.controller.js");

const router = Router();

router.post("/signup", signup);
module.exports = router;
