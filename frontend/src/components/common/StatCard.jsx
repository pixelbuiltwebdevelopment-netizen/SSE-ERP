import React from 'react';

/**
 * Enterprise Metric & KPI Card
 */
const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendUp,
  badge,
  variant = 'default',
  onClick,
}) => {
  const getAccentColor = () => {
    switch (variant) {
      case 'primary':
        return { bg: 'rgba(2, 132, 199, 0.08)', text: '#0284c7', border: '#bae6fd' };
      case 'success':
        return { bg: 'rgba(16, 185, 129, 0.08)', text: '#10b981', border: '#a7f3d0' };
      case 'warning':
        return { bg: 'rgba(245, 158, 11, 0.08)', text: '#f59e0b', border: '#fde68a' };
      case 'danger':
        return { bg: 'rgba(239, 68, 68, 0.08)', text: '#ef4444', border: '#fecaca' };
      case 'purple':
        return { bg: 'rgba(139, 92, 246, 0.08)', text: '#8b5cf6', border: '#ddd6fe' };
      default:
        return { bg: 'rgba(15, 23, 42, 0.05)', text: '#0f172a', border: '#e2e8f0' };
    }
  };

  const colors = getAccentColor();

  return (
    <div
      className={`erp-card p-3 p-md-4 position-relative ${onClick ? 'erp-card-interactive' : ''}`}
      onClick={onClick}
    >
      <div className="d-flex align-items-start justify-content-between mb-2">
        <div className="text-truncate me-2">
          <span
            className="text-uppercase fw-semibold"
            style={{ fontSize: '0.72rem', letterSpacing: '0.06em', color: 'var(--erp-text-muted)' }}
          >
            {title}
          </span>
          {badge && <span className="ms-2">{badge}</span>}
        </div>

        {Icon && (
          <div
            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{
              width: '38px',
              height: '38px',
              backgroundColor: colors.bg,
              color: colors.text,
              border: `1px solid ${colors.border}`,
            }}
          >
            <Icon size={19} strokeWidth={2.2} />
          </div>
        )}
      </div>

      <div className="d-flex align-items-baseline gap-2 mb-1">
        <h3 className="fw-bold mb-0" style={{ color: 'var(--erp-text-main)', letterSpacing: '-0.03em' }}>
          {value ?? 0}
        </h3>
        {trend && (
          <span
            className="fw-semibold small d-inline-flex align-items-center gap-0.5"
            style={{
              color: trendUp ? 'var(--erp-success)' : 'var(--erp-danger)',
              fontSize: '0.75rem',
            }}
          >
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mb-0 small text-truncate" style={{ color: 'var(--erp-text-secondary)', fontSize: '0.78rem' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default StatCard;
