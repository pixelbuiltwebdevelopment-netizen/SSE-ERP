import React from 'react';

/**
 * Enterprise Loading Spinner & Session Loader
 */
const LoadingSpinner = ({
  text = 'Loading...',
  subtext,
  fullScreen = true,
  showRetry = false,
  onRetry = null,
}) => {
  const content = (
    <div className="d-flex flex-column align-items-center justify-content-center text-center p-4">
      {/* Sleek SVG spinner with brand gradient */}
      <div className="position-relative" style={{ width: '48px', height: '48px' }}>
        <svg
          className="erp-spin"
          viewBox="0 0 50 50"
          style={{ width: '100%', height: '100%', animation: 'erpSpin 0.9s linear infinite' }}
        >
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="var(--erp-border)"
            strokeWidth="4"
          />
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="var(--erp-primary)"
            strokeWidth="4"
            strokeDasharray="90 150"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {text && (
        <div
          className="fw-bold mt-3"
          style={{
            fontSize: '0.95rem',
            color: 'var(--erp-text-main)',
            letterSpacing: '0.02em',
          }}
        >
          {text}
        </div>
      )}

      {subtext && (
        <div
          className="text-muted small mt-1"
          style={{ fontSize: '0.825rem', maxWidth: '320px' }}
        >
          {subtext}
        </div>
      )}

      {showRetry && (
        <div className="mt-3 d-flex gap-2">
          <button
            type="button"
            className="erp-btn erp-btn-primary erp-btn-sm"
            onClick={onRetry || (() => window.location.reload())}
          >
            Retry Connection
          </button>
          <a href="/login" className="erp-btn erp-btn-secondary erp-btn-sm">
            Back to Sign In
          </a>
        </div>
      )}

      <style>{`
        @keyframes erpSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  if (!fullScreen) {
    return content;
  }

  return (
    <div
      className="position-fixed top-0 start-0 w-100 vh-100 d-flex align-items-center justify-content-center"
      style={{
        backgroundColor: 'var(--erp-bg)',
        zIndex: 99999,
      }}
    >
      <div className="erp-card p-4 shadow-lg border-0 bg-white" style={{ borderRadius: 'var(--erp-radius-xl)' }}>
        {content}
      </div>
    </div>
  );
};

export default LoadingSpinner;
