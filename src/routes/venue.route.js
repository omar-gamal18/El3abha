const { Router } = require("express");

const { getAllVenuesAdmin } = require("../controllers/venu.controller");

const {} = require("../validators/venue.validator");

const { protect, allowedTo } = require("../middlewares/auth.middleware");

const router = Router();

router.get("/admin", protect, allowedTo("admin"), getAllVenuesAdmin);

module.exports = router;
