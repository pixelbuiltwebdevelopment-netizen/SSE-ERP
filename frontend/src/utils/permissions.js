/**
 * Frontend Permission Evaluator
 * Note: Used solely for UI element visibility & client routing.
 * Backend security middleware handles authoritative enforcement.
 */
export const hasActionPermission = (role, moduleKey, actionKey) => {
  if (!role) {
    return { allowed: false, scope: null };
  }

  // Super Admin has full permissions across all modules
  if (role.key === 'super_admin' || (role.isSystemRole && role.key === 'super_admin')) {
    return { allowed: true, scope: 'ALL' };
  }

  if (!role.permissions || !Array.isArray(role.permissions)) {
    return { allowed: false, scope: null };
  }

  const modulePerm = role.permissions.find(
    (p) => p.module && p.module.toLowerCase() === moduleKey.toLowerCase()
  );

  if (!modulePerm || !modulePerm.actions) {
    return { allowed: false, scope: null };
  }

  const actionPerm = modulePerm.actions[actionKey];

  if (!actionPerm || !actionPerm.allowed) {
    return { allowed: false, scope: null };
  }

  return {
    allowed: true,
    scope: actionPerm.scope || 'OWN',
  };
};

export const can = (role, moduleKey, actionKey = 'view') => {
  const result = hasActionPermission(role, moduleKey, actionKey);
  return result.allowed;
};
