const AppError = require("../utils/appError");
const AuthError = require("../utils/authError");
const env = require("../config/env");
const repository = require("../repositories/auth.repository");
const {
  JWT_ALGORITHMS,
  JWT_AUDIENCE,
  JWT_ISSUER,
} = require("../config/authConstants");

const jwt = require("jsonwebtoken");

exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw new AuthError(
      "You are not logged in! Please log in to get access.",
      401,
    );
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.accessSecret, {
      algorithms: JWT_ALGORITHMS,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  } catch {
    throw AuthError.invalidToken("Invalid access token");
  }

  if (!Number.isInteger(decoded.userId)) {
    throw AuthError.invalidToken("Invalid access token");
  }

  const currentUser = await repository.findUserById(decoded.userId);

  if (!currentUser) {
    throw new AuthError(
      "The user belonging to this token no longer exists.",
      401,
    );
  }

  if (!currentUser.isActive) {
    throw new AuthError("Your account is inactive", 401);
  }

  if (currentUser.passwordChangedAt) {
    const changedTimestamp = parseInt(
      currentUser.passwordChangedAt.getTime() / 1000,
      10,
    );

    if (decoded.iat < changedTimestamp) {
      throw new AuthError(
        "User recently changed their password! Please log in again.",
        401,
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
      throw new AppError("You do not have permission to perform this action", 403);
    }
    next();
  };
