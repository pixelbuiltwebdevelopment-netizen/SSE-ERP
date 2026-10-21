const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const authService = require('../services/authService');
const tokenService = require('../services/tokenService');
const { logActivity } = require('../services/auditService');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  try {
    const { user, accessToken, refreshToken } = await authService.loginUser({
      email,
      password,
      ipAddress,
      userAgent,
    });

    tokenService.setRefreshTokenCookie(res, refreshToken);

    await logActivity({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      action: 'LOGIN',
      module: 'auth',
      description: `User ${user.email} logged in successfully`,
      req,
    });

    res.status(200).json(
      new ApiResponse(
        200,
        { user, accessToken, refreshToken },
        'Login successful'
      )
    );
  } catch (error) {
    await logActivity({
      userName: 'Guest',
      userEmail: email,
      action: 'FAILED_LOGIN',
      module: 'auth',
      description: `Failed login attempt for email: ${email} - ${error.message}`,
      req,
    });
    throw error;
  }
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!refreshToken) {
    return res.status(401).json(new ApiResponse(401, null, 'Refresh token is missing'));
  }

  const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
    await authService.refreshAuthTokens({
      refreshToken,
      ipAddress,
      userAgent,
    });

  tokenService.setRefreshTokenCookie(res, newRefreshToken);

  res.status(200).json(
    new ApiResponse(
      200,
      { accessToken: newAccessToken, refreshToken: newRefreshToken },
      'Token refreshed successfully'
    )
  );
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

  await authService.logoutUser({ refreshToken });
  tokenService.clearRefreshTokenCookie(res);

  if (req.user) {
    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'LOGOUT',
      module: 'auth',
      description: `User ${req.user.email} logged out`,
      req,
    });
  }

  res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
});

const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user._id);
  res.status(200).json(new ApiResponse(200, user, 'Current user profile fetched'));
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  await authService.changePassword({
    userId: req.user._id,
    oldPassword,
    newPassword,
  });

  tokenService.clearRefreshTokenCookie(res);

  await logActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: 'CHANGE_PASSWORD',
    module: 'auth',
    description: `User ${req.user.email} changed password`,
    req,
  });

  res.status(200).json(new ApiResponse(200, null, 'Password changed successfully. Please log in again.'));
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, phone } = req.body;
  const user = await authService.getCurrentUser(req.user._id);

  if (email && email.toLowerCase() !== user.email) {
    const existingEmail = await require('../models/User').findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      throw new require('../utils/ApiError')(400, 'Email address is already in use');
    }
    user.email = email.toLowerCase();
  }

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;

  await user.save();

  await logActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: 'PROFILE_UPDATED',
    module: 'auth',
    description: `User ${req.user.email} updated their profile`,
    req,
  });

  const updatedUser = await authService.getCurrentUser(req.user._id);
  res.status(200).json(new ApiResponse(200, { user: updatedUser }, 'Profile updated successfully'));
});

module.exports = {
  login,
  refresh,
  logout,
  getMe,
  changePassword,
  updateProfile,
};
