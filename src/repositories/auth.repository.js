/**
 * Owns auth-related database reads, writes, and transactions.
 * It must never access Express request/response objects or implement HTTP policy.
 */
const db = require('../prismaClient');
const {
  REFRESH_TOKEN_RETENTION_MS,
} = require('../config/authConstants');

const User = db.orm.public.User;
const RefreshToken = db.orm.public.RefreshToken;

/**
 * Finds a user by the validator-normalized email address.
 * @param {string} email normalized email
 * @returns {Promise<object|null>} user row
 * @throws {Error} database error; no HTTP status is assigned here
 */
exports.findUserByEmail = (email) => User.first({ email });

/**
 * Finds a user by primary key.
 * @param {number} id user id
 * @returns {Promise<object|null>} user row
 * @throws {Error} database error; no HTTP status is assigned here
 */
exports.findUserById = (id) => User.first({ id });

/**
 * Creates a user and returns only fields needed by the auth flow.
 * @param {object} user user fields including the password hash
 * @returns {Promise<object>} created user projection
 * @throws {Error} database error; signup maps unique violations to HTTP 409
 */
exports.createUser = (user) =>
  User.select('id', 'name', 'email', 'phone', 'role', 'isActive').create(
    user,
  );

/**
 * Inserts a refresh-token record containing only its token hash.
 * @param {object} record refresh-token row fields
 * @returns {Promise<object>} created refresh-token row
 * @throws {Error} database error; no HTTP status is assigned here
 */
exports.createRefreshToken = (record) => RefreshToken.create(record);

/**
 * Finds a refresh-token record by its SHA-256 token hash.
 * @param {string} tokenHash refresh-token hash
 * @returns {Promise<object|null>} refresh-token row
 * @throws {Error} database error; no HTTP status is assigned here
 */
exports.findRefreshTokenByHash = (tokenHash) =>
  RefreshToken.first({ tokenHash });

/**
 * Finds a refresh-token record by primary key.
 * @param {number} id refresh-token id
 * @returns {Promise<object|null>} refresh-token row
 * @throws {Error} database error; no HTTP status is assigned here
 */
exports.findRefreshTokenById = (id) => RefreshToken.first({ id });

/**
 * Atomically revokes one active refresh-token row.
 * The id selects the row and IS NULL prevents overwriting an earlier revocation.
 * An empty RETURNING result means the row was already revoked or is missing.
 * @param {number} id refresh-token id
 * @param {Date} revokedAt revocation time
 * @returns {Promise<boolean>} whether a row was revoked
 * @throws {Error} database error; no HTTP status is assigned here
 */
exports.revokeRefreshToken = async (id, revokedAt) =>
  db.transaction(async (tx) => {
    const [revoked] = await tx.query(
      tx.sql.public.RefreshToken
        .update({ revokedAt })
        .where((fields, fns) => fns.eq(fields.id, id))
        .where((fields) => fields.revokedAt.isNull())
        .returning('id')
        .build(),
    );
    return Boolean(revoked);
  });

/**
 * Revokes every active token in one family.
 * The family id scopes the update and IS NULL preserves existing revocation times.
 * An empty RETURNING result means there were no active rows in the family.
 * @param {string|null} familyId token-family id
 * @param {Date} revokedAt revocation time
 * @returns {Promise<void>}
 * @throws {Error} database error; no HTTP status is assigned here
 */
exports.revokeRefreshTokenFamily = async (familyId, revokedAt) => {
  if (!familyId) return;

  await db.transaction(async (tx) =>
    tx.query(
      tx.sql.public.RefreshToken
        .update({ revokedAt })
        .where((fields, fns) => fns.eq(fields.familyId, familyId))
        .where((fields) => fields.revokedAt.isNull())
        .returning('id')
        .build(),
    ),
  );
};

/**
 * Revokes all active refresh tokens for a user inside the caller's transaction.
 * The user id scopes the update and IS NULL preserves existing revocation times.
 * An empty RETURNING result means the user had no active refresh tokens.
 * @param {object} tx transaction client
 * @param {number} userId user id
 * @param {Date} revokedAt revocation time
 * @returns {Promise<Array<object>>} rows revoked by the update
 * @throws {Error} database error; no HTTP status is assigned here
 */
exports.revokeUserRefreshTokens = (tx, userId, revokedAt) =>
  tx.query(
    tx.sql.public.RefreshToken
      .update({ revokedAt })
      .where((fields, fns) => fns.eq(fields.userId, userId))
      .where((fields) => fields.revokedAt.isNull())
      .returning('id')
      .build(),
  );

/**
 * Consumes an active refresh token and inserts its replacement transactionally.
 * The id selects the presented row, IS NULL prevents double consumption, and the
 * expiry condition prevents rotation of an expired token. No returned row means
 * the token could not be consumed, so no replacement is inserted.
 * @param {object} input token, family, user, hash, expiry, and current time
 * @returns {Promise<boolean>} whether rotation committed
 * @throws {Error} database error; no HTTP status is assigned here
 */
exports.rotateRefreshToken = async ({
  recordId,
  familyId,
  userId,
  tokenHash,
  expiresAt,
  now,
}) =>
  db.transaction(async (tx) => {
    const [updated] = await tx.query(
      tx.sql.public.RefreshToken
        .update({ revokedAt: now, familyId })
        .where((token, fns) => fns.eq(token.id, recordId))
        .where((token) => token.revokedAt.isNull())
        .where((token, fns) => fns.gt(token.expiresAt, now))
        .returning('id')
        .build(),
    );

    if (!updated) return false;

    await tx.orm.public.RefreshToken.create({
      userId,
      familyId,
      tokenHash,
      expiresAt,
    });

    return true;
  });

/**
 * Replaces the password-reset challenge fields for one user.
 * @param {number} userId user id
 * @param {object} fields reset challenge fields
 * @returns {Promise<object>} ORM update result
 * @throws {Error} database error; no HTTP status is assigned here
 */
exports.updatePasswordResetChallenge = (userId, fields) =>
  User.whereUnique({ id: userId }).update(fields);

/**
 * Clears a failed email challenge only if its code hash is still current.
 * The id scopes the user and the code hash prevents clearing a newer challenge.
 * An empty update means the challenge has already changed or the user is missing.
 * @param {number} userId user id
 * @param {string} codeHash HMAC hash belonging to the failed send attempt
 * @returns {Promise<object>} ORM update result
 * @throws {Error} database error; no HTTP status is assigned here
 */
exports.clearPasswordResetChallenge = (userId, codeHash) =>
  User.where({ id: userId, passwordResetCode: codeHash }).update({
    passwordResetCode: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    passwordResetVerified: false,
    passwordResetAttempts: 0,
  });

/**
 * Atomically increments attempts for the active matching reset code.
 * The id and code hash bind the attempt to the request's user and code; expiry
 * rejects stale codes and the maximum condition prevents incrementing a locked code.
 * An empty RETURNING result means the code is no longer active or is at its limit.
 * @param {object} input user id, code hash, time, and attempt maximum
 * @returns {Promise<Array<object>>} affected rows
 * @throws {Error} database error; no HTTP status is assigned here
 */
exports.incrementPasswordResetAttempts = async ({
  userId,
  codeHash,
  now,
  maxAttempts,
}) =>
  db.transaction(async (tx) =>
    tx.query(
      tx.raw.sql`
        UPDATE public."User"
        SET "passwordResetAttempts" = "passwordResetAttempts" + 1
        WHERE "id" = ${userId}
          AND "passwordResetCode" = ${codeHash}
          AND "passwordResetExpires" > ${now}
          AND "passwordResetAttempts" < ${maxAttempts}
        RETURNING "id"
      `.returnsRow({ id: 'pg/int4@1' }).build(),
    ),
  );

/**
 * Atomically consumes a reset code and stores the reset-token hash.
 * The id, email, and code hash bind the code to its account and submission; the
 * expiry and attempt checks reject stale or locked codes. An empty RETURNING result
 * means the code was already consumed, expired, changed, or reached its limit.
 * @param {object} input user/email/code, reset-token hash, expiry, time, and limit
 * @returns {Promise<Array<object>>} consumed row, if any
 * @throws {Error} database error; no HTTP status is assigned here
 */
exports.consumePasswordResetCode = async ({
  userId,
  email,
  codeHash,
  resetTokenHash,
  expiresAt,
  now,
  maxAttempts,
}) =>
  db.transaction(async (tx) =>
    tx.query(
      tx.raw.sql`
        UPDATE public."User"
        SET "passwordResetVerified" = TRUE,
            "passwordResetCode" = NULL,
            "passwordResetAttempts" = 0,
            "passwordResetToken" = ${resetTokenHash},
            "passwordResetExpires" = ${expiresAt}
        WHERE "id" = ${userId}
          AND "email" = ${email}
          AND "passwordResetCode" = ${codeHash}
          AND "passwordResetExpires" > ${now}
          AND "passwordResetAttempts" < ${maxAttempts}
        RETURNING "id"
      `.returnsRow({ id: 'pg/int4@1' }).build(),
    ),
  );

/**
 * Finds a user with a verified, unexpired reset-token hash.
 * @param {string} tokenHash SHA-256 reset-token hash
 * @param {Date} now current time
 * @returns {Promise<object|null>} user row
 * @throws {Error} database error; no HTTP status is assigned here
 */
exports.findUserWithResetToken = (tokenHash, now) =>
  User.where((user) => user.passwordResetToken.eq(tokenHash))
    .where((user) => user.passwordResetExpires.gt(now))
    .where((user) => user.passwordResetVerified.eq(true))
    .first();

/**
 * Atomically updates a password, consumes the reset token, and revokes refresh tokens.
 * The id selects the user, token hash binds the reset session, expiry rejects stale
 * sessions, and verified=true requires successful code verification. An empty
 * RETURNING result means the reset session was absent, expired, or already consumed.
 * @param {object} input user id, reset-token hash, password hash, and current time
 * @returns {Promise<boolean>} whether the password update committed
 * @throws {Error} database error; no HTTP status is assigned here
 */
exports.updatePasswordAndRevokeRefreshTokens = async ({
  userId,
  resetTokenHash,
  password,
  now,
}) =>
  db.transaction(async (tx) => {
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
        .where((fields, fns) => fns.eq(fields.id, userId))
        .where((fields, fns) =>
          fns.eq(fields.passwordResetToken, resetTokenHash),
        )
        .where((fields, fns) => fns.gt(fields.passwordResetExpires, now))
        .where((fields, fns) => fns.eq(fields.passwordResetVerified, true))
        .returning('id')
        .build(),
    );

    if (!user) return false;

    await exports.revokeUserRefreshTokens(tx, user.id, now);
    return true;
  });

/**
 * Deletes refresh-token rows expired beyond the configured retention period.
 * @returns {Promise<object>} ORM deletion result
 * @throws {Error} database error; no HTTP status is assigned here
 */
exports.cleanupExpiredRefreshTokens = () => {
  const cutoff = new Date(Date.now() - REFRESH_TOKEN_RETENTION_MS);
  return RefreshToken.where((token) => token.expiresAt.lt(cutoff)).deleteAll();
};
