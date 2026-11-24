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
  const { id } = +req.params;

  const venue = await Venue.whereUnique({ id }).update({
    status: "approved",
  });

  return sendSuccess(
    res,
    { data: { venue } },
    "Venue approved successfully",
    200,
  );
};
