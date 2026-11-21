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

/**
 * Returns a SHA-256 digest for a raw token.
 * @param {string} token raw token
 * @returns {string} lowercase hexadecimal digest
 * @throws {TypeError} if token is not accepted by crypto; no HTTP status is assigned
 */
exports.hashToken = (token) =>
  crypto.createHash(TOKEN_HASH_ALGORITHM).update(token).digest('hex');

/**
 * HMAC-hashes a reset code with the configured reset secret.
 * @param {string} code six-digit reset code
 * @returns {string} lowercase hexadecimal HMAC
 * @throws {Error} if crypto rejects the input or secret; no HTTP status is assigned
 */
exports.hashResetCode = (code) =>
  crypto
    .createHmac(RESET_CODE_HMAC_ALGORITHM, env.resetCodeSecret)
    .update(code)
    .digest('hex');

/**
 * Compares equal-length hexadecimal hashes in constant time.
 * @param {string} submittedHash candidate hash
 * @param {string} storedHash expected hash
 * @returns {boolean} whether the hashes are byte-equal
 * @throws {TypeError} if the converted buffers are invalid for timingSafeEqual; no HTTP status is assigned
 */
exports.safeHashEqual = (submittedHash, storedHash) => {
  const submitted = Buffer.from(submittedHash, 'hex');
  const stored = Buffer.from(storedHash, 'hex');

  return (
    submitted.length === stored.length &&
    crypto.timingSafeEqual(submitted, stored)
  );
};

/**
 * Creates a cryptographically random, zero-padded six-digit reset code.
 * @returns {string} six-digit reset code
 * @throws {RangeError} if the configured random range is invalid; no HTTP status is assigned
 */
exports.createResetCode = () =>
  crypto
    .randomInt(PASSWORD_RESET_CODE_MIN, PASSWORD_RESET_CODE_MAX)
    .toString()
    .padStart(PASSWORD_RESET_CODE_LENGTH, '0');

/**
 * Creates a cryptographically random reset token.
 * @returns {string} hexadecimal raw token
 * @throws {Error} if the system random source fails; no HTTP status is assigned
 */
exports.createRandomToken = () =>
  crypto.randomBytes(AUTH_TOKEN_RANDOM_BYTES).toString('hex');

/**
 * Signs an access JWT for a user.
 * @param {object} user user row with id
 * @returns {string} signed access JWT
 * @throws {Error} if JWT signing fails; no HTTP status is assigned
 */
exports.signAccessToken = (user) =>
  jwt.sign({ userId: user.id }, env.accessSecret, {
    algorithm: JWT_ALGORITHMS[0],
    expiresIn: `${env.accessExpiresMinutes}m`,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

/**
 * Signs a refresh JWT with a new token identifier.
 * @param {object} user user row with id
 * @returns {string} signed refresh JWT
 * @throws {Error} if JWT signing fails; no HTTP status is assigned
 */
exports.signRefreshToken = (user) =>
  jwt.sign({ userId: user.id, jti: crypto.randomUUID() }, env.refreshSecret, {
    algorithm: JWT_ALGORITHMS[0],
    expiresIn: `${env.refreshExpiresDays}d`,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

/**
 * Verifies refresh JWT signature, algorithm, issuer, audience, and expiry.
 * @param {string} token raw refresh JWT
 * @returns {object} decoded JWT payload
 * @throws {Error} if JWT verification fails; the service maps it to HTTP 401
 */
exports.verifyRefreshToken = (token) =>
  jwt.verify(token, env.refreshSecret, {
    algorithms: JWT_ALGORITHMS,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

/**
 * Computes the database expiry timestamp for a refresh token.
 * @param {Date} now current time
 * @returns {Date} refresh-token expiry
 * @throws {TypeError} if now is not a valid Date; no HTTP status is assigned
 */
exports.getRefreshExpiresAt = (now) =>
  new Date(now.getTime() + env.refreshExpiresDays * DAY_MS);
