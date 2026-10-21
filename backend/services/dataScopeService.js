const { MODULE_OWNERSHIP_MAP } = require('../constants/modules');
const mongoose = require('mongoose');

/**
 * Dynamic Data Scope Query Filter Generator for Mongoose Queries
 */
const buildDataScopeFilter = ({ user, moduleKey, actionKey, scope }) => {
  // Super Admin or ALL scope gets unrestricted access
  if ((user.roleId && user.roleId.key === 'super_admin') || scope === 'ALL') {
    return {};
  }

  const userId = user._id;
  const config = MODULE_OWNERSHIP_MAP[moduleKey.toLowerCase()] || MODULE_OWNERSHIP_MAP.default;

  switch (scope) {
    case 'OWN': {
      if (config.employeeIdField) {
        return { [config.employeeIdField]: userId };
      }
      if (config.createdByField && config.assignedToField) {
        return {
          $or: [
            { [config.createdByField]: userId },
            { [config.assignedToField]: userId },
          ],
        };
      }
      return { [config.createdByField || 'createdBy']: userId };
    }

    case 'TEAM': {
      if (!user.teamId) {
        // Fallback to OWN if user has no team assigned
        return buildDataScopeFilter({ user, moduleKey, actionKey, scope: 'OWN' });
      }
      return { teamId: user.teamId };
    }

    case 'DEPARTMENT': {
      if (!user.departmentId) {
        // Fallback to OWN if user has no department assigned
        return buildDataScopeFilter({ user, moduleKey, actionKey, scope: 'OWN' });
      }
      return { departmentId: user.departmentId };
    }

    case 'BRANCH': {
      if (!user.branchId) {
        // Fallback to OWN if user has no branch assigned
        return buildDataScopeFilter({ user, moduleKey, actionKey, scope: 'OWN' });
      }
      return { branchId: user.branchId };
    }

    default:
      // Default fallback to OWN scope for safety
      return buildDataScopeFilter({ user, moduleKey, actionKey, scope: 'OWN' });
  }
};

module.exports = {
  buildDataScopeFilter,
};
