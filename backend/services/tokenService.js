const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/RefreshToken');
const { hashToken } = require('../utils/security');
const ApiError = require('../utils/ApiError');

const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
  });
};

const generateRefreshToken = async (userId, ipAddress = '', userAgent = '') => {
  const token = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
  });

  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await RefreshToken.create({
    userId,
    tokenHash,
    expiresAt,
    ipAddress,
    userAgent,
  });

  return token;
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired access token');
  }
};

const verifyRefreshToken = async (token) => {
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const tokenHash = hashToken(token);
  const storedToken = await RefreshToken.findOne({
    userId: decoded.userId,
    tokenHash,
    revokedAt: null,
  });

  if (!storedToken) {
    throw new ApiError(401, 'Refresh token has been revoked or is invalid');
  }

  return { decoded, storedToken };
};

const setRefreshTokenCookie = (res, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth',
  });
};

const clearRefreshTokenCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    path: '/api/auth',
  });
};

const revokeRefreshToken = async (token) => {
  if (!token) return;
  const tokenHash = hashToken(token);
  await RefreshToken.findOneAndUpdate({ tokenHash }, { revokedAt: new Date() });
};

const revokeAllUserTokens = async (userId) => {
  await RefreshToken.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  revokeRefreshToken,
  revokeAllUserTokens,
};
