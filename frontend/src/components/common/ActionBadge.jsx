import React from 'react';
import { SCOPE_COLORS } from '../../utils/constants';

const ActionBadge = ({ action, scope, allowed }) => {
  if (!allowed) {
    return <span className="badge bg-light text-muted border me-1 mb-1">{action}: ✗</span>;
  }

  const badgeClass = SCOPE_COLORS[scope] || 'bg-primary text-white';

  return (
    <span className={`badge ${badgeClass} me-1 mb-1`}>
      {action}: {scope || 'YES'}
    </span>
  );
};

export default ActionBadge;
