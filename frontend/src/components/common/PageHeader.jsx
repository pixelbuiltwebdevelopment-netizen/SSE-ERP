import React from 'react';
import { Link } from 'react-router-dom';
import BackButton from './BackButton';

/**
 * Standardized Enterprise Page Header
 * Supports:
 * - Breadcrumb navigation
 * - Global consistent Back navigation arrow (showBackButton={true})
 * - Page titles, badges, and contextual subtitles
 * - Right-aligned action buttons
 */
const PageHeader = ({
  title,
  subtitle,
  breadcrumbs = [],
  actions,
  badge,
  showBackButton = false,
  backFallback,
  onBack,
  backTooltip = 'Go Back',
}) => {
  return (
    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 pt-1 pb-2 mb-4">
      <div className="overflow-hidden">
        {/* Breadcrumb Navigation */}
        {breadcrumbs.length > 0 && (
          <nav aria-label="breadcrumb" className="mb-1.5">
            <ol className="breadcrumb mb-0" style={{ fontSize: '0.75rem' }}>
              <li className="breadcrumb-item">
                <Link to="/dashboard" className="text-decoration-none text-muted">
                  ERP
                </Link>
              </li>
              {breadcrumbs.map((b, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return isLast ? (
                  <li key={idx} className="breadcrumb-item active text-primary fw-semibold" aria-current="page">
                    {b.label}
                  </li>
                ) : (
                  <li key={idx} className="breadcrumb-item">
                    {b.path ? (
                      <Link to={b.path} className="text-decoration-none text-muted">
                        {b.label}
                      </Link>
                    ) : (
                      <span className="text-muted">{b.label}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        {/* Title row with optional Back Button */}
        <div className="d-flex align-items-center gap-2.5 flex-wrap">
          {showBackButton && (
            <BackButton
              fallback={backFallback}
              onBack={onBack}
              tooltip={backTooltip}
            />
          )}

          <h2
            className="fw-bold mb-0 text-truncate"
            style={{
              fontSize: 'calc(1.25rem + 0.35vw)',
              letterSpacing: '-0.025em',
              color: 'var(--erp-text-main)',
            }}
          >
            {title}
          </h2>
          {badge && <div className="flex-shrink-0">{badge}</div>}
        </div>

        {subtitle && (
          <p className="text-muted mb-0 mt-1 small" style={{ fontSize: '0.84rem' }}>
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="d-flex align-items-center gap-2 flex-wrap w-100 w-md-auto justify-content-start justify-content-md-end">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
