import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginUser, clearAuthError } from '../../store/slices/authSlice';
import { useAuth } from '../../hooks/useAuth';

// Inline SVG Icons (Guaranteed to render without external font files)
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
    <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/>
  </svg>
);

const EyeSlashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
    <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486z"/>
    <path d="M11.297 9.124a3.5 3.5 0 0 0-4.474-4.474l.823.822a2.5 2.5 0 0 1 2.829 2.829zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829"/>
    <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.709.709zm10.296 8.884-12-12 .708-.708 12 12z"/>
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2M5 8h6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1"/>
  </svg>
);

const EmailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1zm13 2.383-4.708 2.825L15 11.105zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741M1 11.105l4.708-2.897L1 5.383z"/>
  </svg>
);

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, loading, error } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
    return () => {
      dispatch(clearAuthError());
    };
  }, [isAuthenticated, navigate, dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginUser({ email, password }));
  };

  const fillQuickCredentials = (userEmail, userPass) => {
    setEmail(userEmail);
    setPassword(userPass);
  };

  return (
    <div className="login-content w-100 px-2 px-sm-3">
      {/* Title */}
      <div className="text-center mb-4">
        <h4 className="fw-bold text-dark mb-1">Sign In</h4>
        <p className="text-muted small mb-0">Enter your credentials to access your ERP account</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div 
          className="alert alert-danger alert-dismissible fade show small py-2 px-3 border-0 shadow-sm d-flex align-items-center mb-3" 
          role="alert"
        >
          <span className="flex-grow-1">{error}</span>
          <button 
            type="button" 
            className="btn-close shadow-none p-2" 
            aria-label="Close"
            onClick={() => dispatch(clearAuthError())}
          ></button>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="position-relative">
        {/* Loading Overlay */}
        {loading && (
          <div 
            className="position-absolute top-0 start-0 w-100 h-100 rounded-3 d-flex flex-column align-items-center justify-content-center bg-white bg-opacity-75"
            style={{ zIndex: 10, backdropFilter: 'blur(3px)' }}
          >
            <div className="spinner-border text-primary mb-2" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <div className="fw-semibold text-primary small">Authenticating...</div>
          </div>
        )}

        {/* Email Field */}
        <div className="mb-3">
          <label 
            htmlFor="email"
            className="form-label fw-semibold text-secondary small text-uppercase mb-1" 
            style={{ letterSpacing: '0.5px', fontSize: '12px' }}
          >
            Email Address
          </label>
          <div className="input-group">
            <span className="input-group-text bg-light border-0 text-secondary ps-3 pe-2">
              <EmailIcon />
            </span>
            <input
              id="email"
              type="email"
              className="form-control bg-light border-0 shadow-none ps-2 pe-3"
              placeholder="admin@erp.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              autoComplete="email"
              style={{ fontSize: '16px', height: '50px' }}
            />
          </div>
        </div>

        {/* Password Field with Hide / Show Button */}
        <div className="mb-4">
          <label 
            htmlFor="password"
            className="form-label fw-semibold text-secondary small text-uppercase mb-1" 
            style={{ letterSpacing: '0.5px', fontSize: '12px' }}
          >
            Password
          </label>
          
          <div className="input-group">
            {/* Left Lock Icon */}
            <span className="input-group-text bg-light border-0 text-secondary ps-3 pe-2">
              <LockIcon />
            </span>

            {/* Input Element */}
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="form-control bg-light border-0 shadow-none ps-2 pe-2"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
              style={{ fontSize: '16px', height: '50px' }}
            />

            {/* Toggle Eye Button */}
            <button
              type="button"
              className="btn bg-light border-0 text-secondary px-3 shadow-none d-flex align-items-center justify-content-center"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={loading}
              tabIndex="-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{
                height: '50px',
                minWidth: '48px',
                cursor: 'pointer',
                color: '#6c757d'
              }}
            >
              {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="btn btn-primary w-100 fw-bold shadow-sm d-flex align-items-center justify-content-center"
          disabled={loading}
          style={{ height: '50px', fontSize: '15px' }}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2 text-white" role="status"></span>
              Authenticating...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Quick Credentials (2x2 Grid for Mobile, 4-Cols on Desktop) */}
      <div className="mt-4 pt-3 border-top">
        <small 
          className="text-muted fw-bold d-block mb-3 text-center" 
          style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}
        >
          Quick Development Logins
        </small>
        
        <div className="row g-2">
          <div className="col-6 col-sm-3">
            <button
              type="button"
              className="btn btn-light w-100 py-2 px-1 text-truncate fw-semibold shadow-sm text-danger border"
              style={{ fontSize: '12px', minHeight: '40px' }}
              onClick={() => fillQuickCredentials('admin@erp.com', 'Admin@123')}
            >
              Super Admin
            </button>
          </div>
          <div className="col-6 col-sm-3">
            <button
              type="button"
              className="btn btn-light w-100 py-2 px-1 text-truncate fw-semibold shadow-sm text-warning border"
              style={{ fontSize: '12px', minHeight: '40px' }}
              onClick={() => fillQuickCredentials('manager@erp.com', 'Manager@123')}
            >
              Manager
            </button>
          </div>
          <div className="col-6 col-sm-3">
            <button
              type="button"
              className="btn btn-light w-100 py-2 px-1 text-truncate fw-semibold shadow-sm text-info border"
              style={{ fontSize: '12px', minHeight: '40px' }}
              onClick={() => fillQuickCredentials('executive1@erp.com', 'Exec@123')}
            >
              Exec 1
            </button>
          </div>
          <div className="col-6 col-sm-3">
            <button
              type="button"
              className="btn btn-light w-100 py-2 px-1 text-truncate fw-semibold shadow-sm text-secondary border"
              style={{ fontSize: '12px', minHeight: '40px' }}
              onClick={() => fillQuickCredentials('executive2@erp.com', 'Exec@123')}
            >
              Exec 2
            </button>
          </div>
        </div>
      </div>

      {/* Developed By Credit Footer */}
      <div className="text-center mt-4 pt-2">
        <p className="text-muted mb-0" style={{ fontSize: '12px', letterSpacing: '0.3px' }}>
          Developed by{' '}
          <a 
            href="https://runixsoftwaresolutions.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="fw-semibold text-decoration-none"
            style={{ color: '#0d6efd' }}
          >
            runixsoftwaresolutions.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;