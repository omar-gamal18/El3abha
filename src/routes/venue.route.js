const { Router } = require("express");

const {} = require("../controllers/venue.controller.js");

const {} = require("../validators/venue.validator");

const { protect, allowedTo } = require("../middlewares/auth.middleware.js");

const router = Router();

module.exports = router;
