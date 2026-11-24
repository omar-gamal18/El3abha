const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const db = require("../prismaClient");

const Venue = db.orm.public.Venue;

exports.getAllVenues = async (req, res, next) => {
  const venues = await Venue.all();

  senc;
};
