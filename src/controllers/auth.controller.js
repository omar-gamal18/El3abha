const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const AppError = require('../utils/appError');
const { sendSuccess } = require('../utils/apiResponse');
const { sendEmail } = require('../utils/sendEmail');
const db = require('../prismaClient');
const env = require('../config/env');
const logger = require('../utils/logger');

const User = db.orm.public.User;
const RefreshToken = db.orm.public.RefreshToken;

const REFRESH_COOKIE = 'refresh_token';
const RESET_COOKIE = 'resetToken';
const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/v1/auth',
  maxAge: env.refreshExpiresDays * 24 * 60 * 60 * 1000,
};
const resetCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/v1/auth',
  maxAge: 10 * 60 * 1000,
};
const REUSE_GRACE_MS = 15000;
const MAX_RESET_ATTEMPTS = 5;
const JWT_ISSUER = 'el3abha-api';
const JWT_AUDIENCE = 'el3abha-client';
const JWT_ALGORITHMS = ['HS256'];

const createHash = (data) =>
  crypto.createHash('sha256').update(data).digest('hex');

const hashResetCode = (code) => {
  return crypto
    .createHmac('sha256', env.resetCodeSecret)
    .update(code)
    .digest('hex');
};

const normalizeEmail = (email) => email.trim().toLowerCase();

const safeHashEqual = (submittedHash, storedHash) => {
  const submitted = Buffer.from(submittedHash, 'hex');
  const stored = Buffer.from(storedHash, 'hex');

  return (
    submitted.length === stored.length &&
    crypto.timingSafeEqual(submitted, stored)
  );
};

const revokeRefreshTokenFamily = async (familyId) => {
  if (!familyId) return;

  await RefreshToken.where({ familyId })
    .where((token) => token.revokedAt.isNull())
    .updateAll({ revokedAt: new Date() });
};

const signAccessToken = (user) =>
  jwt.sign({ userId: user.id }, env.accessSecret, {
    algorithm: 'HS256',
    expiresIn: `${env.accessExpiresMinutes}m`,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

const signRefreshToken = (user) =>
  jwt.sign(
    { userId: user.id, jti: crypto.randomUUID() },
    env.refreshSecret,
    {
      algorithm: 'HS256',
      expiresIn: `${env.refreshExpiresDays}d`,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
  );

const sendAuthResponse = async (res, user, message, statusCode) => {
  const refreshToken = signRefreshToken(user);

  await RefreshToken.create({
    userId: user.id,
    familyId: crypto.randomUUID(),
    tokenHash: createHash(refreshToken),
    expiresAt: new Date(
      Date.now() + env.refreshExpiresDays * 24 * 60 * 60 * 1000,
    ),
  });

  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };

  return sendSuccess(
    res,
    { user: safeUser, token: signAccessToken(user) },
    message,
    statusCode,
  );
};

exports.signup = async (req, res) => {
  const { name, phone, password } = req.body;
  const email = normalizeEmail(req.body.email);

  const hashedPass = await bcrypt.hash(password, 12);

  let user;
  try {
    user = await User.select('id', 'name', 'email', 'phone', 'role').create({
      name,
      email,
      phone,
      password: hashedPass,
      role: 'PLAYER',
    });
  } catch (error) {
    if (error.code === 'P2002' || error.code === '23505') {
      throw new AppError('Email or phone number is already in use', 409);
    }
    throw error;
  }

  return await sendAuthResponse(res, user, 'User created successfully', 201);
};

const DUMMY_HASH = bcrypt.hashSync('dummy-password', 12);

exports.login = async (req, res, next) => {
  const { password } = req.body;
  const email = normalizeEmail(req.body.email);
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
      await RefreshToken.whereUnique({ id: tokenRecord.id })
        .where((token) => token.revokedAt.isNull())
        .update({ revokedAt: new Date() });
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
    payload = jwt.verify(refreshToken, env.refreshSecret, {
      algorithms: JWT_ALGORITHMS,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  } catch {
    res.clearCookie(REFRESH_COOKIE, { path: refreshCookieOptions.path });
    return next(new AppError('Invalid or expired refresh token', 401));
  }

  if (
    !payload ||
    !Number.isInteger(payload.userId) ||
    typeof payload.jti !== 'string' ||
    payload.jti.length === 0
  ) {
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
    const timeSinceRevocation =
      Date.now() - new Date(tokenRecord.revokedAt).getTime();

    if (timeSinceRevocation >= REUSE_GRACE_MS) {
      await revokeRefreshTokenFamily(tokenRecord.familyId);
      logger.warn('Refresh token reuse detected', {
        userId: tokenRecord.userId,
        familyId: tokenRecord.familyId,
      });
    } else {
      logger.warn('Refresh token retry within grace window', {
        userId: tokenRecord.userId,
        familyId: tokenRecord.familyId,
      });
    }

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
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + env.refreshExpiresDays * 24 * 60 * 60 * 1000,
  );

  const consumed = await db.transaction(async (tx) => {
    const [updated] = await tx.query(
      tx.sql.public.RefreshToken
        .update({ revokedAt: now, familyId })
        .where((token, fns) => fns.eq(token.id, tokenRecord.id))
        .where((token) => token.revokedAt.isNull())
        .where((token, fns) => fns.gt(token.expiresAt, now))
        .returning('id')
        .build(),
    );

    if (!updated) return false;

    await tx.orm.public.RefreshToken.create({
      userId: user.id,
      familyId,
      tokenHash: createHash(rotatedRefreshToken),
      expiresAt,
    });

    return true;
  });

  if (!consumed) {
    const latestRecord = await RefreshToken.first({ id: tokenRecord.id });
    if (latestRecord?.revokedAt) {
      const timeSinceRevocation =
        Date.now() - new Date(latestRecord.revokedAt).getTime();

      if (timeSinceRevocation >= REUSE_GRACE_MS) {
        await revokeRefreshTokenFamily(latestRecord.familyId);
        logger.warn('Refresh token reuse detected', {
          userId: tokenRecord.userId,
          familyId: latestRecord.familyId,
        });
      } else {
        logger.warn('Refresh token retry within grace window', {
          userId: tokenRecord.userId,
          familyId: latestRecord.familyId,
        });
      }
    }

    res.clearCookie(REFRESH_COOKIE, { path: refreshCookieOptions.path });
    return next(new AppError('Session is no longer valid', 401));
  }

  res.cookie(REFRESH_COOKIE, rotatedRefreshToken, refreshCookieOptions);

  return sendSuccess(
    res,
    { token: signAccessToken(user) },
    'Token refreshed successfully',
    200,
  );
};

exports.forgotPassword = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  res.clearCookie(RESET_COOKIE, { path: resetCookieOptions.path });
  const response = sendSuccess(
    res,
    null,
    'If an account exists, a reset code has been sent.',
    200,
  );

  void (async () => {
    let user;
    let hashedResetCode;

    try {
      user = await User.first({ email });
      if (!user) return;

      const resetCode = crypto.randomInt(100000, 1000000).toString();
      hashedResetCode = hashResetCode(resetCode);

      await User.where({ email }).update({
        passwordResetCode: hashedResetCode,
        passwordResetToken: null,
        passwordResetVerified: false,
        passwordResetAttempts: 0,
        passwordResetExpires: new Date(Date.now() + 10 * 60 * 1000),
      });

      await sendEmail({ to: user.email, resetCode });
    } catch (error) {
      logger.error('Password reset email failed', {
        userId: user?.id ?? null,
        familyId: null,
        error: error.message,
      });

      if (user && hashedResetCode) {
        try {
          await User.where({ email, passwordResetCode: hashedResetCode }).update({
            passwordResetCode: null,
            passwordResetToken: null,
            passwordResetExpires: null,
            passwordResetVerified: false,
            passwordResetAttempts: 0,
          });
        } catch (cleanupError) {
          logger.error('Password reset cleanup failed', {
            userId: user.id,
            familyId: null,
            error: cleanupError.message,
          });
        }
      }
    }
  })();

  return response;
};

exports.verifyPassResetCode = async (req, res, next) => {
  const email =
    typeof req.body.email === 'string' ? normalizeEmail(req.body.email) : '';
  const resetCode =
    typeof req.body.resetCode === 'string' ? req.body.resetCode : '';
  const submittedHash = hashResetCode(resetCode);
  const resetCodeError = new AppError('Invalid or expired reset code', 400);
  const now = new Date();
  const user = email ? await User.first({ email }) : null;
  const storedHash =
    typeof user?.passwordResetCode === 'string'
      ? user.passwordResetCode
      : '0'.repeat(64);
  const isCorrect = safeHashEqual(submittedHash, storedHash);

  if (
    !user ||
    !user.passwordResetCode ||
    !user.passwordResetExpires ||
    new Date(user.passwordResetExpires) <= now ||
    user.passwordResetAttempts >= MAX_RESET_ATTEMPTS ||
    !isCorrect
  ) {
    if (
      user?.passwordResetCode &&
      user.passwordResetExpires &&
      new Date(user.passwordResetExpires) > now &&
      user.passwordResetAttempts < MAX_RESET_ATTEMPTS &&
      !isCorrect
    ) {
      await db.transaction(async (tx) => {
        await tx.query(
          tx.raw.sql`
            UPDATE public."User"
            SET "passwordResetAttempts" = "passwordResetAttempts" + 1
            WHERE "id" = ${user.id}
              AND "passwordResetCode" = ${user.passwordResetCode}
              AND "passwordResetExpires" > ${now}
              AND "passwordResetAttempts" < ${MAX_RESET_ATTEMPTS}
          `.affectedCount().build(),
        );
      });
    }

    return next(resetCodeError);
  }

  const resetToken = crypto.randomBytes(32).toString('hex');

  const [consumed] = await db.transaction(async (tx) =>
    tx.query(
      tx.raw.sql`
        UPDATE public."User"
        SET "passwordResetVerified" = TRUE,
            "passwordResetCode" = NULL,
            "passwordResetAttempts" = 0,
            "passwordResetToken" = ${createHash(resetToken)},
            "passwordResetExpires" = ${new Date(now.getTime() + 10 * 60 * 1000)}
        WHERE "id" = ${user.id}
          AND "email" = ${email}
          AND "passwordResetCode" = ${user.passwordResetCode}
          AND "passwordResetExpires" > ${now}
          AND "passwordResetAttempts" < ${MAX_RESET_ATTEMPTS}
        RETURNING "id"
      `.returnsRow({ id: 'pg/int4@1' }).build(),
    ),
  );

  if (!consumed) {
    return next(resetCodeError);
  }

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

  const now = new Date();
  const resetTokenHash = createHash(resetToken);
  const resetUser = await User.where((u) =>
    u.passwordResetToken.eq(resetTokenHash),
  )
    .where((u) => u.passwordResetExpires.gt(now))
    .where((u) => u.passwordResetVerified.eq(true))
    .first();

  if (!resetUser) {
    res.clearCookie(RESET_COOKIE, { path: resetCookieOptions.path });
    return next(new AppError('Invalid or expired reset session', 400));
  }

  const password = await bcrypt.hash(newPassword, 12);
  const updatedUser = await db.transaction(async (tx) => {
    const [user] = await tx.query(
      tx.sql.public.User
        .update({
          password,
          passwordResetCode: null,
          passwordResetToken: null,
          passwordResetExpires: null,
          passwordResetVerified: false,
          passwordResetAttempts: 0,
        })
        .where((fields, fns) => fns.eq(fields.id, resetUser.id))
        .where((fields, fns) =>
          fns.eq(fields.passwordResetToken, resetTokenHash),
        )
        .where((fields, fns) => fns.gt(fields.passwordResetExpires, now))
        .where((fields, fns) => fns.eq(fields.passwordResetVerified, true))
        .returning('id')
        .build(),
    );

    if (!user) return null;

    await tx.execute(
      tx.sql.public.RefreshToken
        .update({ revokedAt: now })
        .where((fields, fns) => fns.eq(fields.userId, user.id))
        .where((fields) => fields.revokedAt.isNull())
        .build(),
    );

    return user;
  });

  if (!updatedUser) {
    res.clearCookie(RESET_COOKIE, { path: resetCookieOptions.path });
    return next(new AppError('Invalid or expired reset session', 400));
  }

  res.clearCookie(RESET_COOKIE, { path: resetCookieOptions.path });
  res.clearCookie(REFRESH_COOKIE, { path: refreshCookieOptions.path });

  return sendSuccess(res, null, 'Password changed successfully', 200);
};

exports.cleanupExpiredRefreshTokens = async () => {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return RefreshToken.where((token) => token.expiresAt.lt(cutoff)).deleteAll();
};
