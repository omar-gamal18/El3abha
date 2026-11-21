const db = require('../prismaClient');

const cleanupExpiredRefreshTokens = async () => {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return db.orm.public.RefreshToken.where((token) =>
    token.expiresAt.lt(cutoff),
  ).deleteAll();
};

module.exports = cleanupExpiredRefreshTokens;
