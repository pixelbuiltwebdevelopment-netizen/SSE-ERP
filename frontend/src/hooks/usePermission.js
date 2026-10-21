import { useAuth } from './useAuth';
import { hasActionPermission } from '../utils/permissions';

export const usePermission = () => {
  const { role } = useAuth();

  const check = (moduleKey, actionKey = 'view') => {
    return hasActionPermission(role, moduleKey, actionKey);
  };

  const can = (moduleKey, actionKey = 'view') => {
    return check(moduleKey, actionKey).allowed;
  };

  return {
    check,
    can,
    role,
  };
};
