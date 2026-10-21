const User = require('../models/User');
const { comparePassword, hashPassword } = require('../utils/security');
const tokenService = require('./tokenService');
const ApiError = require('../utils/ApiError');

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

const loginUser = async ({ email, password, ipAddress, userAgent }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Account is deactivated. Please contact Super Admin.');
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMinutes = Math.ceil((user.lockedUntil - new Date()) / 60000);
    throw new ApiError(
      403,
      `Account locked due to multiple failed login attempts. Try again in ${remainingMinutes} minutes.`
    );
  }

  const isPasswordValid = await comparePassword(password, user.password);

  if (!isPasswordValid) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCK_TIME_MS);
    }
    await user.save();
    throw new ApiError(401, 'Invalid email or password');
  }

  // Reset lock & failed attempts on successful login
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  const populatedUser = await User.findById(user._id)
    .populate('roleId')
    .populate('departmentId')
    .populate('branchId')
    .populate('teamId');

  const accessToken = tokenService.generateAccessToken(user._id);
  const refreshToken = await tokenService.generateRefreshToken(user._id, ipAddress, userAgent);

  return { user: populatedUser, accessToken, refreshToken };
};

const refreshAuthTokens = async ({ refreshToken, ipAddress, userAgent }) => {
  const { decoded, storedToken } = await tokenService.verifyRefreshToken(refreshToken);

  const user = await User.findById(decoded.userId);
  if (!user || !user.isActive) {
    throw new ApiError(403, 'User account is inactive or no longer exists');
  }

  // Token rotation: revoke old token
  await tokenService.revokeRefreshToken(refreshToken);

  // Issue new access token and refresh token
  const newAccessToken = tokenService.generateAccessToken(user._id);
  const newRefreshToken = await tokenService.generateRefreshToken(user._id, ipAddress, userAgent);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

const logoutUser = async ({ refreshToken }) => {
  if (refreshToken) {
    await tokenService.revokeRefreshToken(refreshToken);
  }
};

const changePassword = async ({ userId, oldPassword, newPassword }) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const isMatch = await comparePassword(oldPassword, user.password);
  if (!isMatch) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  user.password = await hashPassword(newPassword);
  await user.save();

  // Revoke all existing sessions
  await tokenService.revokeAllUserTokens(userId);
};

const getCurrentUser = async (userId) => {
  const user = await User.findById(userId)
    .populate('roleId')
    .populate('departmentId')
    .populate('branchId')
    .populate('teamId');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  if (!user.isActive) {
    throw new ApiError(403, 'Account is deactivated');
  }

  return user;
};

module.exports = {
  loginUser,
  refreshAuthTokens,
  logoutUser,
  changePassword,
  getCurrentUser,
};
