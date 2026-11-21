const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const {
  JWT_ALGORITHMS,
  JWT_AUDIENCE,
  JWT_ISSUER,
  AUTH_TOKEN_RANDOM_BYTES,
  DAY_MS,
  PASSWORD_RESET_CODE_MAX,
  PASSWORD_RESET_CODE_LENGTH,
  PASSWORD_RESET_CODE_MIN,
  RESET_CODE_HMAC_ALGORITHM,
  TOKEN_HASH_ALGORITHM,
} = require('../config/authConstants');

exports.hashToken = (token) =>
  crypto.createHash(TOKEN_HASH_ALGORITHM).update(token).digest('hex');

exports.hashResetCode = (code) =>
  crypto
    .createHmac(RESET_CODE_HMAC_ALGORITHM, env.resetCodeSecret)
    .update(code)
    .digest('hex');

exports.safeHashEqual = (submittedHash, storedHash) => {
  const submitted = Buffer.from(submittedHash, 'hex');
  const stored = Buffer.from(storedHash, 'hex');

  return (
    submitted.length === stored.length &&
    crypto.timingSafeEqual(submitted, stored)
  );
};

exports.createResetCode = () =>
  crypto
    .randomInt(PASSWORD_RESET_CODE_MIN, PASSWORD_RESET_CODE_MAX)
    .toString()
    .padStart(PASSWORD_RESET_CODE_LENGTH, '0');

exports.createRandomToken = () =>
  crypto.randomBytes(AUTH_TOKEN_RANDOM_BYTES).toString('hex');

exports.signAccessToken = (user) =>
  jwt.sign({ userId: user.id }, env.accessSecret, {
    algorithm: JWT_ALGORITHMS[0],
    expiresIn: `${env.accessExpiresMinutes}m`,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

exports.signRefreshToken = (user) =>
  jwt.sign({ userId: user.id, jti: crypto.randomUUID() }, env.refreshSecret, {
    algorithm: JWT_ALGORITHMS[0],
    expiresIn: `${env.refreshExpiresDays}d`,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

exports.verifyRefreshToken = (token) =>
  jwt.verify(token, env.refreshSecret, {
    algorithms: JWT_ALGORITHMS,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

exports.getRefreshExpiresAt = (now) =>
  new Date(now.getTime() + env.refreshExpiresDays * DAY_MS);
