const { body, param } = require("express-validator");

const validate = require("../middlewares/validateErrors.middleware");

// Keep these in sync with the enums in schema.prisma
const SPORT_CATEGORIES = [
  "football",
  "padel",
  "basketball",
  "tennis",
  "squash",
  "volleyball",
];
const PITCH_SIZES = [
  "five_a_side",
  "six_a_side",
  "seven_a_side",
  "nine_a_side",
  "eleven_a_side",
];
const PITCH_SURFACES = [
  "artificial_turf",
  "natural_grass",
  "indoor",
  "concrete",
];
const FACILITIES = [
  "floodlights",
  "parking",
  "changing_rooms",
  "showers",
  "water",
  "ball_included",
];

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const text = (field, label, min, max) =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage(`${label} is required`)
    .bail()
    .isLength({ min, max })
    .withMessage(`${label} must be ${min}-${max} characters`);

const enumField = (field, label, values) =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage(`${label} is required`)
    .bail()
    .isIn(values)
    .withMessage(`${label} must be one of: ${values.join(", ")}`);

// Treats "" (an empty form-data field) as not sent, so the DB default applies
const optionalField = (field) =>
  body(field)
    .customSanitizer((value) => (value === "" ? undefined : value))
    .optional();

const time = (field, label) =>
  optionalField(field)
    .matches(TIME_REGEX)
    .withMessage(`${label} must be in HH:MM (24-hour) format`);

const coordinate = (field, label, limit, otherField) => [
  optionalField(field)
    .isFloat({ min: -limit, max: limit })
    .withMessage(`${label} must be between -${limit} and ${limit}`)
    .bail()
    .toFloat(),
  body(otherField)
    .if(body(field).notEmpty())
    .notEmpty()
    .withMessage("Latitude and longitude must be sent together"),
];

const name = text("name", "Name", 2, 60);
const description = text("description", "Description", 10, 1000);
const city = text("city", "City", 2, 50);
const neighborhood = text("neighborhood", "Neighborhood", 2, 50);
const streetAddress = text("streetAddress", "Street address", 5, 150);

const sportCategory = enumField(
  "sportCategory",
  "Sport category",
  SPORT_CATEGORIES,
);
const pitchSize = enumField("pitchSize", "Pitch size", PITCH_SIZES);
const surface = enumField("surface", "Surface", PITCH_SURFACES);

const hourlyPrice = body("hourlyPrice")
  .trim()
  .notEmpty()
  .withMessage("Hourly price is required")
  .bail()
  .isInt({ min: 1, max: 100000 })
  .withMessage("Hourly price must be a whole number between 1 and 100000")
  .bail()
  .toInt();

const bookingDuration = optionalField("bookingDuration")
  .isInt({ min: 30, max: 240 })
  .withMessage("Booking duration must be 30-240 minutes")
  .bail()
  .isDivisibleBy(30)
  .withMessage("Booking duration must be in steps of 30 minutes")
  .bail()
  .toInt();

const contactPhone = body("contactPhone")
  .trim()
  .notEmpty()
  .withMessage("Contact phone is required")
  .bail()
  .isMobilePhone("ar-EG")
  .withMessage("Contact phone must be a valid Egyptian mobile number");

// form-data sends one selected facility as a string, so wrap it in an array
const facilities = [
  body("facilities")
    .optional()
    .toArray()
    .custom((values) => new Set(values).size === values.length)
    .withMessage("Facilities must not contain duplicates"),
  body("facilities.*")
    .isIn(FACILITIES)
    .withMessage(`Each facility must be one of: ${FACILITIES.join(", ")}`),
];

// Closing may be earlier than opening (e.g. 12:00 to 03:00 next day)
const openingTime = time("openingTime", "Opening time");
const closingTime = time("closingTime", "Closing time")
  .bail()
  .custom((value, { req }) => value !== (req.body.openingTime || "12:00"))
  .withMessage("Closing time must differ from opening time");

// Must run after multer so that req.file exists
const image = body("image")
  .custom((_, { req }) => Boolean(req.file))
  .withMessage("A venue photo is required");

const id = param("id").isInt({ min: 1 }).withMessage("Invalid venue ID");

const rejectionReason = text("rejectionReason", "Rejection reason", 5, 500);

exports.createVenueValidator = [
  image,
  name,
  description,
  sportCategory,
  pitchSize,
  surface,
  hourlyPrice,
  bookingDuration,
  city,
  neighborhood,
  streetAddress,
  contactPhone,
  ...coordinate("latitude", "Latitude", 90, "longitude"),
  ...coordinate("longitude", "Longitude", 180, "latitude"),
  ...facilities,
  openingTime,
  closingTime,
  validate,
];

exports.venueIdValidator = [id, validate];

exports.rejectVenueValidator = [id, rejectionReason, validate];
