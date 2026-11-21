const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const AppError = require('../utils/appError');
const AuthError = require('../utils/authError');
const env = require('../config/env');
const logger = require('../utils/logger');
const repository = require('../repositories/auth.repository');
const {
  DUMMY_PASSWORD,
  HASH_HEX_LENGTH,
  PASSWORD_HASH_ROUNDS,
  PASSWORD_RESET_MAX_ATTEMPTS,
  PASSWORD_RESET_TTL_MS,
  REFRESH_TOKEN_GRACE_MS,
  RESET_TOKEN_TTL_MS,
  SIGNUP_DEFAULT_ROLE,
} = require('../config/authConstants');
const {
  createRandomToken,
  createResetCode,
  getRefreshExpiresAt,
  hashResetCode,
  hashToken,
  safeHashEqual,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../utils/authTokens');
const { sendEmail } = require('../utils/sendEmail');

const DUMMY_HASH = bcrypt.hashSync(DUMMY_PASSWORD, PASSWORD_HASH_ROUNDS);

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
});

const sendAuthTokens = async (user) => {
  const refreshToken = signRefreshToken(user);
  const familyId = crypto.randomUUID();

  await repository.createRefreshToken({
    userId: user.id,
    familyId,
    tokenHash: hashToken(refreshToken),
    expiresAt: getRefreshExpiresAt(new Date()),
  });

  return {
    user: publicUser(user),
    accessToken: signAccessToken(user),
    refreshToken,
  };
};

const invalidResetCode = () =>
  new AppError('Invalid or expired reset code', 400);

const invalidResetSession = (message) => {
  const error = new AppError(message, 400);
  error.clearResetCookie = true;
  return error;
};

const handleRevokedToken = async (record) => {
  const isReuse =
    Date.now() - new Date(record.revokedAt).getTime() >=
    REFRESH_TOKEN_GRACE_MS;

  if (isReuse) {
    await repository.revokeRefreshTokenFamily(record.familyId, new Date());
    logger.warn('Refresh token reuse detected', {
      userId: record.userId,
      familyId: record.familyId,
    });
    throw new AuthError(AuthError.INVALID_TOKEN_MESSAGE, 401, {
      clearCookie: true,
    });
  }

  logger.warn('Refresh token retry within grace window', {
    userId: record.userId,
    familyId: record.familyId,
  });
  throw new AuthError(AuthError.INVALID_TOKEN_MESSAGE, 409, {
    clearCookie: false,
  });
};

/**
 * Creates a player account and starts a refresh-token family.
 * @param {{name: string, phone: string, password: string, email: string}} input
 * @returns {Promise<{user: object, accessToken: string, refreshToken: string}>}
 * @throws {AppError} 409 email or phone is already in use
 */
exports.signup = async ({ name, phone, password, email }) => {
  const hashedPassword = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
  let user;

  try {
    user = await repository.createUser({
      name,
      email,
      phone,
      password: hashedPassword,
      role: SIGNUP_DEFAULT_ROLE,
    });
  } catch (error) {
    if (error.code === 'P2002' || error.code === '23505') {
      throw new AppError('Email or phone number is already in use', 409);
    }
    throw error;
  }

  return sendAuthTokens(user);
};

/**
 * Verifies credentials and starts a refresh-token family.
 * @param {{email: string, password: string}} input
 * @returns {Promise<{user: object, accessToken: string, refreshToken: string}>}
 * @throws {AppError} 401 credentials are invalid or the account is inactive
 */
exports.login = async ({ email, password }) => {
  const user = await repository.findUserByEmail(email);
  const isValid = await bcrypt.compare(
    password,
    user ? user.password : DUMMY_HASH,
  );

  if (!user || !isValid) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new AppError('Your account is inactive', 401);
  }

  return sendAuthTokens(user);
};

/**
 * Revokes the supplied refresh token when it is still active.
 * @param {string|undefined} refreshToken
 * @returns {Promise<void>}
 */
exports.logout = async (refreshToken) => {
  if (!refreshToken) return;

  const record = await repository.findRefreshTokenByHash(hashToken(refreshToken));
  if (record && !record.revokedAt) {
    await repository.revokeRefreshToken(record.id, new Date());
  }
};

/**
 * Rotates a refresh token within its existing family.
 * @param {string|undefined} refreshToken
 * @returns {Promise<{accessToken: string, refreshToken: string}>}
 * @throws {AuthError} 401 invalid token or detected reuse
 * @throws {AuthError} 409 retry during the grace window
 */
exports.rotateRefreshToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new AuthError('Refresh token not found', 401);
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw AuthError.invalidToken('Invalid or expired refresh token');
  }

  if (
    !payload ||
    !Number.isInteger(payload.userId) ||
    typeof payload.jti !== 'string' ||
    payload.jti.length === 0
  ) {
    throw AuthError.invalidToken('Invalid or expired refresh token');
  }

  const tokenRecord = await repository.findRefreshTokenByHash(
    hashToken(refreshToken),
  );
  if (!tokenRecord || tokenRecord.userId !== payload.userId) {
    throw AuthError.invalidToken('Session is no longer valid');
  }

  if (tokenRecord.revokedAt) {
    await handleRevokedToken(tokenRecord);
  }

  const now = new Date();
  if (tokenRecord.expiresAt <= now) {
    throw AuthError.invalidToken('Session is no longer valid');
  }

  const user = await repository.findUserById(payload.userId);
  if (!user || !user.isActive) {
    throw AuthError.invalidToken('Session is no longer valid');
  }

  const nextRefreshToken = signRefreshToken(user);
  const familyId = tokenRecord.familyId || crypto.randomUUID();
  const consumed = await repository.rotateRefreshToken({
    recordId: tokenRecord.id,
    familyId,
    userId: user.id,
    tokenHash: hashToken(nextRefreshToken),
    expiresAt: getRefreshExpiresAt(now),
    now,
  });

  if (!consumed) {
    const latestRecord = await repository.findRefreshTokenById(tokenRecord.id);
    if (latestRecord?.revokedAt) {
      await handleRevokedToken(latestRecord);
    }
    throw AuthError.invalidToken('Session is no longer valid');
  }

  return {
    refreshToken: nextRefreshToken,
    accessToken: signAccessToken(user),
  };
};

/**
 * Sends a reset code without exposing whether the email exists.
 * @param {string} email normalized by the validator
 * @returns {Promise<void>}
 */
exports.forgotPassword = async (email) => {
  let user;
  let codeHash;

  try {
    user = await repository.findUserByEmail(email);
    if (!user) return;

    const resetCode = createResetCode();
    codeHash = hashResetCode(resetCode);
    const now = new Date();

    await repository.updatePasswordResetChallenge(user.id, {
      passwordResetCode: codeHash,
      passwordResetToken: null,
      passwordResetVerified: false,
      passwordResetAttempts: 0,
      passwordResetExpires: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
    });

    await sendEmail({ to: user.email, resetCode });
  } catch (error) {
    logger.error('Password reset email failed', {
      userId: user?.id ?? null,
      error: error.message,
    });

    if (user && codeHash) {
      try {
        await repository.clearPasswordResetChallenge(user.id, codeHash);
      } catch (cleanupError) {
        logger.error('Password reset cleanup failed', {
          userId: user.id,
          error: cleanupError.message,
        });
      }
    }
  }
};

/**
 * Verifies and consumes a reset code bound to an email.
 * @param {{email: string, resetCode: string|number}} input
 * @returns {Promise<string>} reset token
 * @throws {AppError} 400 invalid or expired reset code
 */
exports.verifyPasswordResetCode = async ({ email, resetCode }) => {
  const user = await repository.findUserByEmail(email);
  const codeHash = hashResetCode(String(resetCode ?? ''));
  const storedHash =
    typeof user?.passwordResetCode === 'string'
      ? user.passwordResetCode
      : '0'.repeat(HASH_HEX_LENGTH);
  const isCorrect = safeHashEqual(codeHash, storedHash);
  const now = new Date();
  const hasActiveCode =
    user?.passwordResetCode &&
    user.passwordResetExpires &&
    new Date(user.passwordResetExpires) > now;
  const attempts = user?.passwordResetAttempts ?? PASSWORD_RESET_MAX_ATTEMPTS;

  if (
    hasActiveCode &&
    attempts < PASSWORD_RESET_MAX_ATTEMPTS &&
    !isCorrect
  ) {
    await repository.incrementPasswordResetAttempts({
      userId: user.id,
      codeHash: user.passwordResetCode,
      now,
      maxAttempts: PASSWORD_RESET_MAX_ATTEMPTS,
    });
  }

  if (!hasActiveCode || attempts >= PASSWORD_RESET_MAX_ATTEMPTS || !isCorrect) {
    throw invalidResetCode();
  }

  const resetToken = createRandomToken();
  const [consumed] = await repository.consumePasswordResetCode({
    userId: user.id,
    email,
    codeHash: user.passwordResetCode,
    resetTokenHash: hashToken(resetToken),
    expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS),
    now,
    maxAttempts: PASSWORD_RESET_MAX_ATTEMPTS,
  });

  if (!consumed) throw invalidResetCode();
  return resetToken;
};

/**
 * Updates the password and revokes all refresh tokens for the user.
 * @param {string} newPassword
 * @param {string|undefined} resetToken
 * @returns {Promise<void>}
 * @throws {AppError} 400 invalid or expired reset session
 */
exports.resetPassword = async (newPassword, resetToken) => {
  if (!resetToken) {
    throw new AppError(
      'Reset session expired. Please verify your code again',
      400,
    );
  }

  const now = new Date();
  const resetTokenHash = hashToken(resetToken);
  const user = await repository.findUserWithResetToken(resetTokenHash, now);

  if (!user) {
    throw invalidResetSession('Invalid or expired reset session');
  }

  const password = await bcrypt.hash(newPassword, PASSWORD_HASH_ROUNDS);
  const updated = await repository.updatePasswordAndRevokeRefreshTokens({
    userId: user.id,
    resetTokenHash,
    password,
    now,
  });

  if (!updated) {
    throw invalidResetSession('Invalid or expired reset session');
  }
};
