const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const db = require("../prismaClient");

const User = db.orm.public.User;

const REFRESH_COOKIE = "refresh_token";
const REFRESH_DAYS = +process.env.JWT_REFRESH_EXPIRES_DAYS;

const signAccessToken = (user) =>
  jwt.sign({ userId: user.id }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_MINUTES,
  });

const signRefreshToken = (user) =>
  jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: `${REFRESH_DAYS}d`,
  });

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/v1/auth",
  maxAge: REFRESH_DAYS * 24 * 60 * 60 * 1000,
};

const sendAuthResponse = (res, user, message, statusCode) => {
  res.cookie(REFRESH_COOKIE, signRefreshToken(user.id), refreshCookieOptions);

  const { password, ...safeUser } = user;

  return sendSuccess(
    res,
    { user: safeUser, token: signAccessToken(user.id) },
    message,
    statusCode,
  );
};

exports.signup = async (req, res, next) => {
  const { name, email, phone, password, role } = req.body;

  const hashedPass = await bcrypt.hash(password, 12);

  const user = await User.select("id", "name", "email", "phone", "role").create(
    {
      name,
      email,
      phone,
      password: hashedPass,
      role,
    },
  );

  return sendAuthResponse(res, user, "User created successfully", 201);
};

exports.login = async (req, res, next) => {
  const user = await User.first({ email: req.body.email });

  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return next(new AppError("Invalid email or password", 401));
  }

  return sendAuthResponse(res, user, "User logged in successfully", 200);
};

exports.refresh = async (req, res, next) => {
  const refreshToken = req.cookies[REFRESH_COOKIE];
  if (!refreshToken) {
    return next(new AppError("Refresh token not found", 401));
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE, { path: refreshCookieOptions.path });
    return next(new AppError("Invalid or expired refresh token", 401));
  }

  const user = await User.first({ id: payload.userId });
  if (!user) {
    res.clearCookie(REFRESH_COOKIE, { path: refreshCookieOptions.path });
    return next(new AppError("User not found", 404));
  }

  return sendSuccess(
    res,
    { token: signAccessToken(user) },
    " token refreshed successfully",
    200,
  );
};

exports.logout = (req, res) => {
  res.clearCookie(REFRESH_COOKIE, { path: refreshCookieOptions.path });
  return res.status(204).send();
};
