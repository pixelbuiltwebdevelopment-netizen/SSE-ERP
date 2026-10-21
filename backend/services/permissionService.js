/**
 * Permission verification engine for checking dynamic role action rights
 */
const hasPermission = (role, moduleKey, actionKey) => {
  if (!role) {
    return { allowed: false, scope: null };
  }

  // Super Admin bypass: Always full access with ALL scope
  if (role.key === 'super_admin' || role.isSystemRole && role.key === 'super_admin') {
    return { allowed: true, scope: 'ALL' };
  }

  if (!role.permissions || !Array.isArray(role.permissions)) {
    return { allowed: false, scope: null };
  }

  const modulePerm = role.permissions.find(
    (p) => p.module.toLowerCase() === moduleKey.toLowerCase()
  );

  if (!modulePerm || !modulePerm.actions) {
    return { allowed: false, scope: null };
  }

  // Handle both Mongoose Map (.get) and plain JavaScript objects
  const actionPerm = typeof modulePerm.actions.get === 'function'
    ? modulePerm.actions.get(actionKey)
    : modulePerm.actions[actionKey];

  if (!actionPerm || !actionPerm.allowed) {
    return { allowed: false, scope: null };
  }

  return {
    allowed: true,
    scope: actionPerm.scope || 'OWN',
  };
};

module.exports = {
  hasPermission,
};
