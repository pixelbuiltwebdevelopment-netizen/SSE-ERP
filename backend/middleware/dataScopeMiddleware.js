const { buildDataScopeFilter } = require('../services/dataScopeService');
const { hasPermission } = require('../services/permissionService');

/**
 * Middleware factory for injecting req.dataScopeFilter Mongoose query filter
 * Usage: router.get('/', authenticate, authorize('tickets', 'view'), applyDataScope('tickets', 'view'), getTickets);
 */
const applyDataScope = (moduleKey, actionKey) => {
  return (req, res, next) => {
    let scope = req.actionScope;

    const targetModule = (req.query && req.query.module) ? req.query.module : moduleKey;

    if (!scope || (req.query && req.query.module)) {
      const permResult = hasPermission(req.user.roleId, targetModule, actionKey);
      scope = permResult.scope || 'OWN';
    }

    req.dataScopeFilter = buildDataScopeFilter({
      user: req.user,
      moduleKey: targetModule,
      actionKey,
      scope,
    });

    next();
  };
};

module.exports = applyDataScope;
