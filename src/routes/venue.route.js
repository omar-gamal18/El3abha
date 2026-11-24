const { Router } = require("express");

const {
  getAllVenues,
  getAllVenuesAdmin,
  approveVenue,
  rejectVenue,
  pauseVenue,
  resumeVenue,
  getMyVenue,
} = require("../controllers/venue.controller");

// const {} = require("../validators/venue.validator");

const { protect, allowedTo } = require("../middlewares/auth.middleware");

const router = Router();

router.get("/", getAllVenues);

router.use(protect);

router.patch("/:id/my", allowedTo("owner"), getMyVenue);
router.patch("/:id/pause", allowedTo("owner"), pauseVenue);
router.patch("/:id/resume", allowedTo("owner"), resumeVenue);

router.use(allowedTo("admin"));

router.get("/admin/all", getAllVenuesAdmin);
router.patch("/:id/approve", approveVenue);
router.patch("/:id/reject", rejectVenue);

module.exports = router;
