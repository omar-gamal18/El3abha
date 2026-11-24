const { Router } = require("express");

const {
  getAllVenues,
  getVenue,
  getAllVenuesAdmin,
  approveVenue,
  rejectVenue,
  pauseVenue,
  resumeVenue,
  getMyVenues,
  deleteVenue,
} = require("../controllers/venue.controller");

// const {} = require("../validators/venue.validator");

const { protect, allowedTo } = require("../middlewares/auth.middleware");

const router = Router();

router.get("/", getAllVenues);

router.get("/my", protect, allowedTo("owner"), getMyVenues);
router.get("/admin/all", protect, allowedTo("admin"), getAllVenuesAdmin);

router.get("/:id", getVenue);

router.use(protect);

router.patch("/:id/pause", allowedTo("owner", "admin"), pauseVenue);
router.patch("/:id/resume", allowedTo("owner", "admin"), resumeVenue);
router.delete("/:id", protect, allowedTo("owner", "admin"), deleteVenue);

router.use(allowedTo("admin"));

router.patch("/:id/approve", approveVenue);
router.patch("/:id/reject", rejectVenue);

module.exports = router;
