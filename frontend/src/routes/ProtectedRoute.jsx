import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePermission } from '../hooks/usePermission';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ProtectedRoute = ({ module = null, action = 'view' }) => {
  const { isAuthenticated, loading, isSuperAdmin } = useAuth();
  const { can } = usePermission();

  if (loading) {
    return <LoadingSpinner text="VERIFYING ACCESS" subtext="Checking route permissions..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (module) {
    const hasRight = isSuperAdmin || can(module, action);
    if (!hasRight) {
      return <Navigate to="/403" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;