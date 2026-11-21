const repository = require('../repositories/auth.repository');

/**
 * Deletes refresh-token rows beyond the retention period.
 * @returns {Promise<object>} ORM deletion result
 * @throws {Error} database error; no HTTP status is assigned
 */
const cleanupRefreshTokens = async () =>
  repository.cleanupExpiredRefreshTokens();

module.exports = cleanupRefreshTokens;
