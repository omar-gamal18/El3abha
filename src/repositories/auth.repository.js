const db = require('../prismaClient');
const {
  REFRESH_TOKEN_RETENTION_MS,
} = require('../config/authConstants');

const User = db.orm.public.User;
const RefreshToken = db.orm.public.RefreshToken;

exports.findUserByEmail = (email) => User.first({ email });

exports.findUserById = (id) => User.first({ id });

exports.createUser = (user) =>
  User.select('id', 'name', 'email', 'phone', 'role', 'isActive').create(
    user,
  );

exports.createRefreshToken = (record) => RefreshToken.create(record);

exports.findRefreshTokenByHash = (tokenHash) =>
  RefreshToken.first({ tokenHash });

exports.findRefreshTokenById = (id) => RefreshToken.first({ id });

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

exports.revokeUserRefreshTokens = (tx, userId, revokedAt) =>
  tx.query(
    tx.sql.public.RefreshToken
      .update({ revokedAt })
      .where((fields, fns) => fns.eq(fields.userId, userId))
      .where((fields) => fields.revokedAt.isNull())
      .returning('id')
      .build(),
  );

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

exports.updatePasswordResetChallenge = (userId, fields) =>
  User.whereUnique({ id: userId }).update(fields);

exports.clearPasswordResetChallenge = (userId, codeHash) =>
  User.where({ id: userId, passwordResetCode: codeHash }).update({
    passwordResetCode: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    passwordResetVerified: false,
    passwordResetAttempts: 0,
  });

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

exports.findUserWithResetToken = (tokenHash, now) =>
  User.where((user) => user.passwordResetToken.eq(tokenHash))
    .where((user) => user.passwordResetExpires.gt(now))
    .where((user) => user.passwordResetVerified.eq(true))
    .first();

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

exports.cleanupExpiredRefreshTokens = () => {
  const cutoff = new Date(Date.now() - REFRESH_TOKEN_RETENTION_MS);
  return RefreshToken.where((token) => token.expiresAt.lt(cutoff)).deleteAll();
};
