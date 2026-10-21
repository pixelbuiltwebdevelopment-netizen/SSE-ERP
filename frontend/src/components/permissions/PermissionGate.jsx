import React from 'react';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../hooks/useAuth';

/**
 * PermissionGate Component
 * Wraps UI elements (Buttons, Actions, Sections) and hides them if unauthorized.
 * Usage: <PermissionGate module="tickets" action="create"> <button>Create Ticket</button> </PermissionGate>
 */
const PermissionGate = ({ module, action = 'view', fallback = null, children }) => {
  const { can } = usePermission();
  const { isSuperAdmin } = useAuth();

  const isAllowed = isSuperAdmin || can(module, action);

  if (!isAllowed) {
    return fallback;
  }

  return <>{children}</>;
};

export default PermissionGate;
