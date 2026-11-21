require('dotenv').config();

const required = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'RESET_CODE_SECRET',
  'JWT_ACCESS_EXPIRES_MINUTES',
  'JWT_REFRESH_EXPIRES_DAYS',
];

for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

const accessExpiresMinutes = Number(process.env.JWT_ACCESS_EXPIRES_MINUTES);
const refreshExpiresDays = Number(process.env.JWT_REFRESH_EXPIRES_DAYS);

if (!Number.isFinite(accessExpiresMinutes) || accessExpiresMinutes <= 0) {
  throw new Error('JWT_ACCESS_EXPIRES_MINUTES must be a positive number');
}

if (!Number.isFinite(refreshExpiresDays) || refreshExpiresDays <= 0) {
  throw new Error('JWT_REFRESH_EXPIRES_DAYS must be a positive number');
}

module.exports = Object.freeze({
  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  resetCodeSecret: process.env.RESET_CODE_SECRET,
  accessExpiresMinutes,
  refreshExpiresDays,
});
