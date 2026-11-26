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
  createVenue,
} = require("../controllers/venue.controller");

const {
  createVenueValidator,
  venueIdValidator,
  rejectVenueValidator,
} = require("../validators/venue.validator");

const { protect, allowedTo } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

const router = Router();

router.get("/", getAllVenues);

router.get("/my", protect, allowedTo("OWNER"), getMyVenues);
router.get("/admin/all", protect, allowedTo("ADMIN"), getAllVenuesAdmin);

router.get("/:id", venueIdValidator, getVenue);

router.post(
  "/",
  protect,
  allowedTo("OWNER"),
  upload.single("image"),
  createVenueValidator,
  createVenue,
);

router.use(protect);

router.patch(
  "/:id/pause",
  allowedTo("OWNER", "ADMIN"),
  venueIdValidator,
  pauseVenue,
);
router.patch(
  "/:id/resume",
  allowedTo("OWNER", "ADMIN"),
  venueIdValidator,
  resumeVenue,
);
router.delete(
  "/:id",
  allowedTo("OWNER", "ADMIN"),
  venueIdValidator,
  deleteVenue,
);

router.use(allowedTo("ADMIN"));

router.patch("/:id/approve", venueIdValidator, approveVenue);
router.patch("/:id/reject", rejectVenueValidator, rejectVenue);

module.exports = router;
