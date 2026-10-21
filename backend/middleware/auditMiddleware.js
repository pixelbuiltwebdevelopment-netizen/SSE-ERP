const { logActivity } = require('../services/auditService');

/**
 * Audit Middleware to automatically record write operations (POST, PUT, PATCH, DELETE)
 */
const auditLog = (actionName, moduleName) => {
  return (req, res, next) => {
    // Record log after response has finished successfully
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logActivity({
          userId: req.user ? req.user._id : null,
          userName: req.user ? req.user.name : 'Guest',
          userEmail: req.user ? req.user.email : '',
          action: actionName,
          module: moduleName,
          resourceId: req.params.id || req.body.id || '',
          description: `${actionName} executed on ${moduleName} by ${req.user ? req.user.email : 'Unknown'}`,
          req,
        });
      }
    });
    next();
  };
};

module.exports = auditLog;
