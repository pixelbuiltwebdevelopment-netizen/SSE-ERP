const { hasPermission } = require('../services/permissionService');
const ApiError = require('../utils/ApiError');

/**
 * Middleware factory for checking action level permissions
 * Usage: router.get('/', authenticate, authorize('tickets', 'view'), getTickets);
 */
const authorize = (moduleKey, actionKey) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roleId) {
      return next(new ApiError(403, 'Access denied. User role missing.'));
    }

    const { allowed, scope } = hasPermission(req.user.roleId, moduleKey, actionKey);

    if (!allowed) {
      return next(
        new ApiError(
          403,
          `Access denied. You do not have permission to perform '${actionKey}' on module '${moduleKey}'.`
        )
      );
    }

    req.actionScope = scope;
    next();
  };
};

module.exports = authorize;
