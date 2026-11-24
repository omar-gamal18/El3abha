const { Router } = require("express");

const {
  getAllVenuesAdmin,
  approveVenue,
  rejectVenue,
  pauseVenue,
  resumeVenue,
} = require("../controllers/venue.controller");

// const {} = require("../validators/venue.validator");

const { protect, allowedTo } = require("../middlewares/auth.middleware");

const router = Router();

router.patch("/:id/pause", protect, allowedTo("owner"), pauseVenue);
router.patch("/:id/resume", protect, allowedTo("owner"), resumeVenue);

router.get("/admin/all", protect, allowedTo("admin"), getAllVenuesAdmin);

router.patch("/:id/approve", protect, allowedTo("admin"), approveVenue);
router.patch("/:id/reject", protect, allowedTo("admin"), rejectVenue);

module.exports = router;
