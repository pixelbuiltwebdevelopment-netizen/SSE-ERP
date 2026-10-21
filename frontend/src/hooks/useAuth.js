import { useSelector } from 'react-redux';

export const useAuth = () => {
  const { user, isAuthenticated, loading, error } = useSelector((state) => state.auth);

  return {
    user,
    role: user ? user.roleId : null,
    isAuthenticated,
    loading,
    error,
    isSuperAdmin: user && user.roleId && (user.roleId.key === 'super_admin' || user.roleId.isSystemRole),
  };
};
