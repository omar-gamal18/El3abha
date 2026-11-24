const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const db = require("../prismaClient");

const Venue = db.orm.public.Venue;

exports.getAllVenuesAdmin = async (req, res, next) => {
  const venues = await Venue.all();

  return sendSuccess(
    res,
    { results: venues.length, data: { venues } },
    "data retrieved successfully",
    200,
  );
};

exports.approveVenue = async (req, res, next) => {
  const { id } = Number(req.params);

  if (!Number.isInteger(id)) {
    return next(new AppError("Venue ID is required", 400));
  }

  const venue = await Venue.whereUnique({ id }).update({
    status: "approved",
  });

  if (!venue) {
    return next(new AppError("No venue found with that ID", 404));
  }

  return sendSuccess(res, { data: { venue } }, "Venue approved ", 200);
};

exports.rejectVenue = async (req, res, next) => {
  const { id } = Number(req.params);

  if (!Number.isInteger(id)) {
    return next(new AppError("Venue ID is required", 400));
  }

  const venue = await Venue.whereUnique({ id }).update({
    status: "rejected",
    rejectionReason: req.body.rejectionReason,
  });

  if (!venue) {
    return next(new AppError("No venue found with that ID", 404));
  }

  return sendSuccess(res, { data: { venue } }, "Venue rejected", 200);
};
