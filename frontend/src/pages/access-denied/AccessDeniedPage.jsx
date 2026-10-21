import React from 'react';
import { useNavigate } from 'react-router-dom';

const AccessDeniedPage = () => {
  const navigate = useNavigate();

  return (
    <div className="container py-5 text-center">
      <div className="card shadow border-0 p-5 mx-auto" style={{ maxWidth: '550px' }}>
        <div className="text-danger mb-3">
          <i className="bi bi-shield-slash-fill" style={{ fontSize: '4rem' }}></i>
        </div>
        <h2 className="fw-bold text-dark">403 - Access Denied</h2>
        <p className="text-muted mb-4">
          You do not have permission to view or perform operations on this module. If you believe this is an error, please contact your Super Administrator to adjust your role action rights.
        </p>
        <button className="btn btn-primary fw-bold" onClick={() => navigate('/dashboard')}>
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default AccessDeniedPage;
