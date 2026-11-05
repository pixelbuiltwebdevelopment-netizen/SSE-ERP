import React from 'react';

/**
 * Standardized Empty State Component
 */
const EmptyState = ({
  icon: Icon,
  title = 'No records found',
  description = 'There is currently no data to display for this view or query filter.',
  actionLabel,
  onAction,
}) => {
  return (
    <div className="text-center py-5 px-3">
      <div
        className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
        style={{
          width: '56px',
          height: '56px',
          backgroundColor: 'var(--erp-surface-subtle)',
          color: 'var(--erp-text-muted)',
          border: '1px solid var(--erp-border)',
        }}
      >
        {Icon ? <Icon size={26} strokeWidth={1.8} /> : <span>📁</span>}
      </div>

      <h5 className="fw-bold mb-1" style={{ color: 'var(--erp-text-main)', fontSize: '1rem' }}>
        {title}
      </h5>

      <p className="text-muted small mx-auto mb-3" style={{ maxWidth: '380px', fontSize: '0.825rem' }}>
        {description}
      </p>

      {actionLabel && onAction && (
        <button type="button" className="erp-btn erp-btn-primary erp-btn-sm" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
