const repository = require('../repositories/auth.repository');

const cleanupRefreshTokens = async () =>
  repository.cleanupExpiredRefreshTokens();

module.exports = cleanupRefreshTokens;
