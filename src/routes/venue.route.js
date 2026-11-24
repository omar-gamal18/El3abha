const { Router } = require("express");

const {
  getAllVenuesAdmin,
  approveVenue,
} = require("../controllers/venue.controller");

// const {} = require("../validators/venue.validator");

const { protect, allowedTo } = require("../middlewares/auth.middleware");

const router = Router();

router.get("/admin", protect, allowedTo("admin"), getAllVenuesAdmin);

router.patch("/:id/approve", protect, allowedTo("admin"), approveVenue);

module.exports = router;
