import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const AccessDeniedPage = () => {
  const navigate = useNavigate();

  return (
    <div className="d-flex align-items-center justify-content-center py-5 erp-fade-in" style={{ minHeight: '65vh' }}>
      <div className="erp-card p-5 text-center shadow-lg mx-auto" style={{ maxWidth: '520px' }}>
        <div
          className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
          style={{
            width: '64px',
            height: '64px',
            backgroundColor: 'var(--erp-danger-bg)',
            color: 'var(--erp-danger)',
            border: '1px solid var(--erp-danger-border)',
          }}
        >
          <ShieldAlert size={32} strokeWidth={2.2} />
        </div>

        <h3 className="fw-bold mb-2" style={{ color: 'var(--erp-text-main)' }}>
          403 — Access Restricted
        </h3>

        <p className="text-muted small mb-4" style={{ lineHeight: 1.6 }}>
          You do not have the required action rights or data scope permissions to access this enterprise module. Contact your System Super Administrator if you require elevated privileges.
        </p>

        <button
          type="button"
          className="erp-btn erp-btn-primary mx-auto"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft size={16} /> Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default AccessDeniedPage;
