const crypto = require("crypto");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const { sendEmail } = require("../utils/sendEmail");
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
  res.cookie(REFRESH_COOKIE, signRefreshToken(user), refreshCookieOptions);

  const { password, ...safeUser } = user;

  return sendSuccess(
    res,
    { user: safeUser, token: signAccessToken(user) },
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

const DUMMY_HASH = bcrypt.hashSync("dummy-password", 12);

exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.first({ email });

  const isValid = await bcrypt.compare(
    password,
    user ? user.password : DUMMY_HASH,
  );

  if (!user || !isValid) {
    return next(new AppError("Invalid email or password", 401));
  }

  return sendAuthResponse(res, user, "User logged in successfully", 200);
};

exports.logout = (req, res) => {
  res.clearCookie(REFRESH_COOKIE, { path: refreshCookieOptions.path });
  return res.status(204).send();
};

exports.refresh = async (req, res, next) => {
  const refreshToken = req.cookies[REFRESH_COOKIE];
  if (!refreshToken) {
    return next(new AppError("Refresh token not found", 401));
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    res.clearCookie(REFRESH_COOKIE, { path: refreshCookieOptions.path });
    return next(new AppError("Invalid or expired refresh token", 401));
  }

  const user = await User.first({ id: payload.userId });
  if (!user) {
    res.clearCookie(REFRESH_COOKIE, { path: refreshCookieOptions.path });
    return next(new AppError("Session is no longer valid", 401));
  }

  return sendSuccess(
    res,
    { token: signAccessToken(user) },
    " token refreshed successfully",
    200,
  );
};

const createHash = (data) =>
  crypto.createHash("sha256").update(data).digest("hex");

exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  const user = await User.first({ email });

  if (!user) {
    return next(
      new AppError(`There is no user with this email: ${req.body.email}`, 404),
    );
  }

  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedResetCode = createHash(resetCode);

  await User.where({ email }).update({
    passwordResetCode: hashedResetCode,
    passwordResetExpires: new Date(Date.now() + 10 * 60 * 1000),
  });

  try {
    await sendEmail({ to: user.email, resetCode });
  } catch (err) {
    await User.where({ email }).update({
      passwordResetCode: null,
      passwordResetExpires: null,
      passwordResetVerified: false,
    });
    return next(new AppError("Error sending the email. Try again later.", 500));
  }

  return sendSuccess(res, null, "Reset code sent to your email", 200);
};

exports.verifyPassResetCode = async (req, res, next) => {
  const { resetCode } = req.body;
  const hashedResetCode = createHash(resetCode.toString());

  const user = await User.where((u) => u.passwordResetCode.eq(hashedResetCode))
    .where((u) => u.passwordResetExpires.gt(new Date()))
    .first();

  if (!user)
    return next(new AppError("Reset code is invalid or has expired", 400));

  await User.whereUnique({ id: user.id }).update({
    passwordResetVerified: true,
  });

  return sendSuccess(res, null, "Reset code verified", 200);
};
