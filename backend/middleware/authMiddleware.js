const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const tokenService = require('../services/tokenService');
const User = require('../models/User');

const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Authentication required. Access token missing.');
  }

  const decoded = tokenService.verifyAccessToken(token);

  const user = await User.findById(decoded.userId)
    .populate('roleId')
    .populate('departmentId')
    .populate('branchId')
    .populate('teamId');

  if (!user) {
    throw new ApiError(401, 'Authenticated user account no longer exists');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your user account has been deactivated');
  }

  req.user = user;
  next();
});

module.exports = {
  authenticate,
};
