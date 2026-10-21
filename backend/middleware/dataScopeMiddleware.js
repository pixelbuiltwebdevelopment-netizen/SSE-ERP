const { buildDataScopeFilter } = require('../services/dataScopeService');
const { hasPermission } = require('../services/permissionService');

/**
 * Middleware factory for injecting req.dataScopeFilter Mongoose query filter
 * Usage: router.get('/', authenticate, authorize('tickets', 'view'), applyDataScope('tickets', 'view'), getTickets);
 */
const applyDataScope = (moduleKey, actionKey) => {
  return (req, res, next) => {
    let scope = req.actionScope;

    if (!scope) {
      const permResult = hasPermission(req.user.roleId, moduleKey, actionKey);
      scope = permResult.scope || 'OWN';
    }

    req.dataScopeFilter = buildDataScopeFilter({
      user: req.user,
      moduleKey,
      actionKey,
      scope,
    });

    next();
  };
};

module.exports = applyDataScope;
