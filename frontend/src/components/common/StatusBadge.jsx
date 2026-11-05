import React from 'react';

/**
 * Standardized Enterprise Status & Scope Badges
 */
const StatusBadge = ({ status = '', size = 'md', className = '' }) => {
  if (!status) return null;

  const normalized = String(status).toLowerCase().trim();

  let variant = 'neutral';
  let label = status;

  switch (normalized) {
    case 'active':
    case 'present':
    case 'approved':
    case 'paid':
    case 'resolved':
    case 'completed':
    case 'on-time':
    case 'success':
      variant = 'success';
      break;

    case 'pending':
    case 'pending-review':
    case 'in progress':
    case 'open':
    case 'medium':
    case 'late':
    case 'half-day':
    case 'draft':
      variant = 'warning';
      break;

    case 'inactive':
    case 'rejected':
    case 'absent':
    case 'urgent':
    case 'high':
    case 'failed':
    case 'missing-punch-out':
    case 'overdue':
      variant = 'danger';
      break;

    case 'all':
    case 'branch':
    case 'low':
    case 'normal ticket':
    case 'info':
    case 'out door ticket':
    case 'outdoor':
      variant = 'info';
      break;

    case 'department':
    case 'team':
    case 'amc':
    case 'amc ticket':
    case 'round silo':
      variant = 'purple';
      break;

    case 'rewinding':
    case 'rewinding ticket':
      variant = 'warning';
      break;

    case 'panel board':
    case 'panel board ticket':
      variant = 'primary';
      break;

    case 'own':
      variant = 'neutral';
      break;

    default:
      variant = 'neutral';
      break;
  }

  const sizeStyle = size === 'sm' ? { fontSize: '0.675rem', padding: '0.15rem 0.45rem' } : {};

  return (
    <span className={`erp-badge erp-badge-${variant} ${className}`} style={sizeStyle}>
      <span className="erp-badge-dot" />
      <span>{label}</span>
    </span>
  );
};

export default StatusBadge;
