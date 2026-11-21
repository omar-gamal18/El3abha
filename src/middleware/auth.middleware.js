const db = require("../prismaClient");
const AppError = require("../utils/appError");
const env = require("../config/env");

const jwt = require("jsonwebtoken");

const User = db.orm.public.User;
const JWT_ISSUER = "el3abha-api";
const JWT_AUDIENCE = "el3abha-client";

exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401),
    );
  }

  const decoded = jwt.verify(token, env.accessSecret, {
    algorithms: ["HS256"],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

  if (!Number.isInteger(decoded.userId)) {
    return next(new AppError("Invalid access token", 401));
  }

  const currentUser = await User.first({ id: decoded.userId });

  if (!currentUser) {
    return next(
      new AppError("The user belonging to this token no longer exists.", 401),
    );
  }

  if (!currentUser.isActive) {
    return next(new AppError("Your account is inactive", 401));
  }

  if (currentUser.passwordChangedAt) {
    const changedTimestamp = parseInt(
      currentUser.passwordChangedAt.getTime() / 1000,
      10,
    );

    if (decoded.iat < changedTimestamp) {
      return next(
        new AppError(
          "User recently changed their password! Please log in again.",
          401,
        ),
      );
    }
  }

  req.user = currentUser;

  next();
};

exports.allowedTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403),
      );
    }
    next();
  };
