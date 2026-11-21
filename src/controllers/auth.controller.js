const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const AppError = require('../utils/appError');
const { sendSuccess } = require('../utils/apiResponse');
const { sendEmail } = require('../utils/sendEmail');
const db = require('../prismaClient');

const User = db.orm.public.User;
const RefreshToken = db.orm.public.RefreshToken;

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_DAYS = +process.env.JWT_REFRESH_EXPIRES_DAYS;

const createHash = (data) =>
  crypto.createHash('sha256').update(data).digest('hex');

const signAccessToken = (user) =>
  jwt.sign({ userId: user.id }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_MINUTES,
  });

const signRefreshToken = (user) =>
  jwt.sign(
    { userId: user.id, jti: crypto.randomUUID() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: `${REFRESH_DAYS}d` },
  );

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/v1/auth',
  maxAge: REFRESH_DAYS * 24 * 60 * 60 * 1000,
};

const sendAuthResponse = async (res, user, message, statusCode) => {
  const refreshToken = signRefreshToken(user);

  await RefreshToken.create({
    userId: user.id,
    familyId: crypto.randomUUID(),
    tokenHash: createHash(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000),
  });

  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);

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

  const user = await User.select('id', 'name', 'email', 'phone', 'role').create(
    {
      name,
      email,
      phone,
      password: hashedPass,
      role,
    },
  );

  return await sendAuthResponse(res, user, 'User created successfully', 201);
};

const DUMMY_HASH = bcrypt.hashSync('dummy-password', 12);

exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.first({ email });

  const isValid = await bcrypt.compare(
    password,
    user ? user.password : DUMMY_HASH,
  );

  if (!user || !isValid) {
    return next(new AppError('Invalid email or password', 401));
  }

  if (!user.isActive) {
    return next(new AppError('Your account is inactive', 401));
  }

  return await sendAuthResponse(res, user, 'User logged in successfully', 200);
};

exports.logout = async (req, res) => {
  const refreshToken = req.cookies[REFRESH_COOKIE];

  if (refreshToken) {
    const tokenRecord = await RefreshToken.first({
      tokenHash: createHash(refreshToken),
    });

    if (tokenRecord && !tokenRecord.revokedAt) {
      await RefreshToken.whereUnique({ id: tokenRecord.id }).update({
        revokedAt: new Date(),
      });
    }
  }

  res.clearCookie(REFRESH_COOKIE, { path: refreshCookieOptions.path });
  return res.status(204).send();
};

exports.refresh = async (req, res, next) => {
  const refreshToken = req.cookies[REFRESH_COOKIE];
  if (!refreshToken) {
    return next(new AppError('Refresh token not found', 401));
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    res.clearCookie(REFRESH_COOKIE, { path: refreshCookieOptions.path });
    return next(new AppError('Invalid or expired refresh token', 401));
  }

  const tokenRecord = await RefreshToken.first({
    tokenHash: createHash(refreshToken),
  });

  if (!tokenRecord || tokenRecord.userId !== payload.userId) {
    res.clearCookie(REFRESH_COOKIE, { path: refreshCookieOptions.path });
    return next(new AppError('Session is no longer valid', 401));
  }

  if (tokenRecord.revokedAt) {
    if (tokenRecord.familyId) {
      await RefreshToken.where({ familyId: tokenRecord.familyId }).update({
        revokedAt: new Date(),
      });
    }

    console.warn(`Refresh token reuse detected for user ${tokenRecord.userId}`);
    res.clearCookie(REFRESH_COOKIE, { path: refreshCookieOptions.path });
    return next(new AppError('Session is no longer valid', 401));
  }

  if (tokenRecord.expiresAt <= new Date()) {
    res.clearCookie(REFRESH_COOKIE, { path: refreshCookieOptions.path });
    return next(new AppError('Session is no longer valid', 401));
  }

  const user = await User.first({ id: payload.userId });
  if (!user || !user.isActive) {
    res.clearCookie(REFRESH_COOKIE, { path: refreshCookieOptions.path });
    return next(new AppError('Session is no longer valid', 401));
  }

  const rotatedRefreshToken = signRefreshToken(user);
  const familyId = tokenRecord.familyId || crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);

  await db.transaction(async (tx) => {
    await tx.orm.public.RefreshToken.whereUnique({ id: tokenRecord.id }).update({
      revokedAt: new Date(),
      familyId,
    });

    await tx.orm.public.RefreshToken.create({
      userId: user.id,
      familyId,
      tokenHash: createHash(rotatedRefreshToken),
      expiresAt,
    });
  });

  res.cookie(REFRESH_COOKIE, rotatedRefreshToken, refreshCookieOptions);

  return sendSuccess(
    res,
    { token: signAccessToken(user) },
    'Token refreshed successfully',
    200,
  );
};

exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  const user = await User.first({ email });

  if (!user) {
    return sendSuccess(
      res,
      null,
      'If an account exists, a reset code has been sent.',
      200,
    );
  }

  const resetCode = crypto.randomInt(100000, 1000000).toString();
  const hashedResetCode = createHash(resetCode);

  await User.where({ email }).update({
    passwordResetCode: hashedResetCode,
    passwordResetExpires: new Date(Date.now() + 10 * 60 * 1000),
  });

  try {
    await sendEmail({ to: user.email, resetCode });
  } catch (err) {
    console.error('Failed to send password reset email:', err);
    await User.where({ email }).update({
      passwordResetCode: null,
      passwordResetExpires: null,
      passwordResetVerified: false,
    });
  }

  return sendSuccess(
    res,
    null,
    'If an account exists, a reset code has been sent.',
    200,
  );
};

const RESET_COOKIE = 'resetToken';
const resetCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/v1/auth',
  maxAge: 10 * 60 * 1000,
};

exports.verifyPassResetCode = async (req, res, next) => {
  const { resetCode } = req.body;
  const hashedResetCode = createHash(resetCode.toString());

  const user = await User.where((u) => u.passwordResetCode.eq(hashedResetCode))
    .where((u) => u.passwordResetExpires.gt(new Date()))
    .first();

  if (!user)
    return next(new AppError('Reset code is invalid or has expired', 400));

  const resetToken = crypto.randomBytes(32).toString('hex');

  await User.whereUnique({ id: user.id }).update({
    passwordResetVerified: true,
    passwordResetCode: null,
    passwordResetToken: createHash(resetToken),
    passwordResetExpires: new Date(Date.now() + 10 * 60 * 1000),
  });

  res.cookie(RESET_COOKIE, resetToken, resetCookieOptions);

  return sendSuccess(res, null, 'Reset code verified', 200);
};

exports.resetPassword = async (req, res, next) => {
  const { newPassword } = req.body;
  const resetToken = req.cookies[RESET_COOKIE];

  if (!resetToken)
    return next(
      new AppError('Reset session expired. Please verify your code again', 400),
    );

  const user = await User.where((u) =>
    u.passwordResetToken.eq(createHash(resetToken)),
  )
    .where((u) => u.passwordResetExpires.gt(new Date()))
    .where((u) => u.passwordResetVerified.eq(true))
    .first();

  if (!user) {
    res.clearCookie(RESET_COOKIE, { path: resetCookieOptions.path });
    return next(new AppError('Invalid or expired reset session', 400));
  }

  await User.whereUnique({ id: user.id }).update({
    password: await bcrypt.hash(newPassword, 12),
    passwordResetCode: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    passwordResetVerified: false,
  });

  await RefreshToken.where({ userId: user.id }).update({
    revokedAt: new Date(),
  });

  res.clearCookie(RESET_COOKIE, { path: resetCookieOptions.path });
  res.clearCookie(REFRESH_COOKIE, { path: refreshCookieOptions.path });

  return sendSuccess(res, null, 'Password changed successfully', 200);
};
