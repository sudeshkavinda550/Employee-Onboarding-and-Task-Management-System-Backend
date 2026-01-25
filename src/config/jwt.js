const jwt = require('jsonwebtoken');

const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your_jwt_secret_key',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'your_refresh_secret_key',
  expiresIn: process.env.JWT_EXPIRE || '7d',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
};

const generateToken = (payload) => {
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
  });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.secret);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.refreshSecret);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

module.exports = {
  jwtConfig,
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
};