import React from 'react';

const ActionBadge = ({ action, scope, allowed }) => {
  if (!allowed) {
    return (
      <span
        className="erp-badge erp-badge-neutral me-1 mb-1"
        style={{ opacity: 0.6, fontSize: '0.675rem' }}
      >
        {action}: ✗
      </span>
    );
  }

  const getScopeBadge = () => {
    switch (scope) {
      case 'ALL':
        return 'erp-badge-info';
      case 'DEPARTMENT':
      case 'TEAM':
        return 'erp-badge-purple';
      case 'BRANCH':
        return 'erp-badge-warning';
      default:
        return 'erp-badge-success';
    }
  };

  return (
    <span className={`erp-badge ${getScopeBadge()} me-1 mb-1`} style={{ fontSize: '0.675rem' }}>
      {action}: {scope || 'Allowed'}
    </span>
  );
};

export default ActionBadge;
