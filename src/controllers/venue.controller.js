const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const db = require("../prismaClient");

const Venue = db.orm.public.Venue;

const findOwnedVenue = async (req) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    throw new AppError("Venue ID is required", 400);
  }

  const venue = await Venue.whereUnique({ id }).first();

  if (!venue) {
    throw new AppError("No venue found with that ID", 404);
  }

  if (venue.ownerId !== req.user.id && req.user.role !== "admin") {
    throw new AppError("You are not authorized to perform this action", 403);
  }

  return venue;
};

exports.getAllVenues = async (req, res, next) => {
  const venues = await Venue.where({
    status: "approved",
    isActive: true,
  }).all();

  return sendSuccess(
    res,
    { results: venues.length, data: { venues } },
    "data retrieved successfully",
    200,
  );
};

exports.getVenue = async (req, res, next) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return next(new AppError("Venue ID is required", 400));
  }

  const venue = await Venue.whereUnique({ id }).first();

  if (!venue) {
    return next(new AppError("No venue found with that ID", 404));
  }

  const isPublic = venue.status === "approved" && venue.isActive;
  const isOwner = req.user && venue.ownerId === req.user.id;
  const isAdmin = req.user && req.user.role === "admin";

  if (!isPublic && !isOwner && !isAdmin) {
    return next(new AppError("No venue found with that ID", 404));
  }

  return sendSuccess(
    res,
    { data: { venue } },
    "data retrieved successfully",
    200,
  );
};

exports.getMyVenue = async (req, res, next) => {
  const venues = await Venue.whereUnique({ ownerId: req.user.id }).all();
  return sendSuccess(
    res,
    { results: venues.length, data: { venues } },
    "data retrieved successfully",
    200,
  );
};

exports.pauseVenue = async (req, res, next) => {
  const venue = await findOwnedVenue(req);

  const pausedVenue = await Venue.whereUnique({ id: venue.id }).update({
    isActive: false,
  });

  if (!venue) {
    return next(new AppError("No venue found with that ID", 404));
  }

  return sendSuccess(
    res,
    { data: { venue: pausedVenue } },
    "Venue paused",
    200,
  );
};

exports.resumeVenue = async (req, res, next) => {
  const venue = await findOwnedVenue(req);

  const resumedVenue = await Venue.whereUnique({ id: venue.id }).update({
    isActive: true,
  });

  if (!venue) {
    return next(new AppError("No venue found with that ID", 404));
  }

  return sendSuccess(
    res,
    { data: { venue: resumedVenue } },
    "Venue resumed",
    200,
  );
};

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
  const id = Number(req.params.id);

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
  const id = Number(req.params.id);

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
