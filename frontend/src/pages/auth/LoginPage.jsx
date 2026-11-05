import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Headset,
  Ticket,
  TrendingUp,
  Monitor,
  FlaskConical,
  Settings,
  X,
  HelpCircle,
} from 'lucide-react';
import { loginUser, clearAuthError } from '../../store/slices/authSlice';
import { useAuth } from '../../hooks/useAuth';
import './LoginPage.css';

const FEATURE_CARDS = [
  {
    id: 'service-ops',
    title: 'Service\nOperations',
    shortTitle: 'Service Operations',
    icon: Headset,
  },
  {
    id: 'ticket-dispatch',
    title: 'Ticket\nDispatching',
    shortTitle: 'Ticket Dispatching',
    icon: Ticket,
  },
  {
    id: 'expense-claims',
    title: 'Expense\nClaims',
    shortTitle: 'Expense Claims',
    icon: TrendingUp,
  },
  {
    id: 'audit-compliance',
    title: 'Audit &\nCompliance',
    shortTitle: 'Audit & Compliance',
    icon: ShieldCheck,
  },
];

const QUICK_ROLES = [
  {
    id: 'dev',
    label: 'Dev Login',
    icon: Monitor,
    email: 'executive1@erp.com',
    pass: 'Exec@123',
    roleName: 'Field / Dev Exec',
  },
  {
    id: 'test',
    label: 'Test Login',
    icon: FlaskConical,
    email: 'manager@erp.com',
    pass: 'Manager@123',
    roleName: 'Sales Manager',
  },
  {
    id: 'admin',
    label: 'Admin Login',
    icon: Settings,
    email: 'admin@erp.com',
    pass: 'Admin@123',
    roleName: 'Super Admin',
  },
];

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [activeQuickRole, setActiveQuickRole] = useState(null);

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
    if (!email.trim() || !password) return;
    dispatch(loginUser({ email: email.trim(), password }));
  };

  const handleQuickFill = (role) => {
    setEmail(role.email);
    setPassword(role.pass);
    setActiveQuickRole(role.id);
    dispatch(clearAuthError());
  };

  return (
    <div className="sse-login-wrapper py-3 py-sm-4 py-lg-5 px-3 px-sm-4 px-lg-5">
      {/* ──────────────────────────────────────────────────────────
          DECORATIVE ENERGETIC WAVE RIBBONS (Top & Bottom Left)
          ────────────────────────────────────────────────────────── */}
      <svg
        className="sse-wave-top d-none d-md-block"
        viewBox="0 0 620 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="sseTopGradientCyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#0080ff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#0052cc" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="sseTopGradientDeep" x1="10%" y1="0%" x2="100%" y2="80%">
            <stop offset="0%" stopColor="#0066fe" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#003b99" stopOpacity="0.75" />
          </linearGradient>
        </defs>
        <path
          d="M 60 0 C 180 80, 320 140, 460 90 C 530 65, 580 30, 620 0 L 620 0 Z"
          fill="url(#sseTopGradientDeep)"
        />
        <path
          d="M 140 0 C 240 85, 380 115, 490 70 C 550 45, 595 18, 620 0 L 620 0 Z"
          fill="url(#sseTopGradientCyan)"
        />
      </svg>

      <svg
        className="sse-wave-bottom d-none d-md-block"
        viewBox="0 0 540 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="sseBottomGradientCyan" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0052cc" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#0088ff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="sseBottomGradientDeep" x1="0%" y1="100%" x2="100%" y2="20%">
            <stop offset="0%" stopColor="#002d7a" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0056d6" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <path
          d="M 0 110 C 110 130, 220 200, 310 280 L 0 280 Z"
          fill="url(#sseBottomGradientDeep)"
        />
        <path
          d="M 0 145 C 90 155, 180 215, 260 280 L 0 280 Z"
          fill="url(#sseBottomGradientCyan)"
        />
      </svg>

      {/* ──────────────────────────────────────────────────────────
          MAIN CONTENT CONTAINER
          ────────────────────────────────────────────────────────── */}
      <div className="container-fluid position-relative" style={{ maxWidth: '1360px', zIndex: 2 }}>
        
        {/* MOBILE TOP BANNER (Visible only on < 992px) */}
        <div className="d-lg-none text-center mb-3 pt-2">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle bg-white shadow-sm mb-2"
            style={{
              width: '52px',
              height: '52px',
              border: '1.5px solid rgba(0, 82, 204, 0.15)',
              padding: '2px',
            }}
          >
            <img
              src="/logo.png"
              alt="Satya Sai Electricals Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: '50%',
              }}
            />
          </div>
          <h3
            className="fw-bold mb-0 text-dark"
            style={{
              letterSpacing: '-0.02em',
              fontSize: '1.35rem',
            }}
          >
            Satya Sai Electricals
          </h3>
          <span
            className="fw-bold text-uppercase d-block mt-0.5"
            style={{
              fontSize: '10.5px',
              letterSpacing: '0.1em',
              color: '#475569',
            }}
          >
            SSE ENTERPRISE OPERATIONS ERP
          </span>
          <p className="small text-muted mt-1 mb-2" style={{ fontSize: '0.82rem' }}>
            Enterprise ERP for{' '}
            <strong style={{ color: '#0052cc' }}>Electrical Service Operations</strong>
          </p>
        </div>

        <div className="row align-items-center justify-content-between g-4 g-xl-5 min-vh-lg-100 py-lg-4">
          
          {/* ──────────────────────────────────────────────────────────
              LEFT COLUMN: HERO BRANDING & FEATURE BADGES
              Visible on Large screens (>= 992px)
              ────────────────────────────────────────────────────────── */}
          <div className="d-none d-lg-flex col-lg-7 col-xl-7 flex-column justify-content-between pe-lg-4 pe-xl-5">
            {/* Top Brand Block */}
            <div className="d-flex align-items-center gap-3 mb-4 mb-xl-5">
              <div
                className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 bg-white shadow-sm"
                style={{
                  width: '56px',
                  height: '56px',
                  border: '1.5px solid rgba(0, 82, 204, 0.15)',
                  padding: '3px',
                }}
              >
                <img
                  src="/logo.png"
                  alt="Satya Sai Electricals Logo"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    borderRadius: '50%',
                  }}
                />
              </div>
              <div>
                <h4
                  className="fw-bold mb-0"
                  style={{
                    color: '#0f172a',
                    letterSpacing: '-0.02em',
                    fontSize: 'clamp(1.2rem, 2vw, 1.45rem)',
                    lineHeight: 1.15,
                  }}
                >
                  Satya Sai Electricals
                </h4>
                <span
                  className="fw-bold text-uppercase d-block mt-0.5"
                  style={{
                    fontSize: '11px',
                    letterSpacing: '0.12em',
                    color: '#475569',
                  }}
                >
                  SSE ENTERPRISE OPERATIONS ERP
                </span>
              </div>
            </div>

            {/* Hero Headline & Subtitle */}
            <div className="mb-4 mb-xl-5">
              <h1
                className="fw-extrabold mb-3"
                style={{
                  fontSize: 'clamp(2.1rem, 3.8vw, 3.4rem)',
                  lineHeight: 1.14,
                  letterSpacing: '-0.03em',
                  color: '#0f172a',
                }}
              >
                Enterprise ERP for{' '}
                <span
                  style={{
                    color: '#0052cc',
                    background: 'linear-gradient(135deg, #0052cc 0%, #0072ff 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    display: 'inline-block',
                  }}
                >
                  Electrical Service Operations
                </span>
              </h1>

              <p
                className="mb-4"
                style={{
                  fontSize: 'clamp(0.95rem, 1.35vw, 1.08rem)',
                  lineHeight: 1.65,
                  color: '#334155',
                  maxWidth: '560px',
                  fontWeight: '500',
                }}
              >
                Manage service calls, field assignments, ticket dispatching,
                expenses, and compliance — all in one unified platform.
              </p>

              {/* Cyan-Blue Accent Underline Bar */}
              <div
                style={{
                  width: '52px',
                  height: '4.5px',
                  borderRadius: '999px',
                  background: 'linear-gradient(90deg, #0052cc 0%, #00c0fa 100%)',
                }}
              />
            </div>

            {/* 4 Feature Badges in a Row */}
            <div className="mt-2">
              <div className="d-flex flex-nowrap gap-3">
                {FEATURE_CARDS.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div key={card.id} className="sse-feature-card">
                      <div className="sse-feature-icon-box">
                        <Icon size={24} strokeWidth={2.2} />
                      </div>
                      <p className="sse-feature-label">{card.title}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────
              RIGHT COLUMN: FLOATING ELEVATED LOGIN CARD
              ────────────────────────────────────────────────────────── */}
          <div className="col-12 col-lg-5 col-xl-5 d-flex justify-content-center justify-content-lg-end">
            <div className="sse-login-card">
              {/* Card Header Brand Icon & Name */}
              <div className="text-center mb-3">
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle bg-white shadow-sm mb-2"
                  style={{
                    width: '54px',
                    height: '54px',
                    border: '1.5px solid rgba(0, 82, 204, 0.15)',
                    padding: '3px',
                  }}
                >
                  <img
                    src="/logo.png"
                    alt="Satya Sai Electricals Logo"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      borderRadius: '50%',
                    }}
                  />
                </div>
                <h5
                  className="fw-bold mb-0"
                  style={{
                    color: '#0f172a',
                    letterSpacing: '-0.02em',
                    fontSize: '1.18rem',
                  }}
                >
                  Satya Sai Electricals
                </h5>
                <span
                  className="d-block fw-bold text-uppercase mt-0.5"
                  style={{
                    fontSize: '10px',
                    letterSpacing: '0.1em',
                    color: '#64748b',
                  }}
                >
                  SSE ENTERPRISE OPERATIONS ERP
                </span>
              </div>

              {/* Welcome Back & Subtitle */}
              <div className="text-center mb-4">
                <h2
                  className="fw-bold mb-1"
                  style={{
                    fontSize: '1.65rem',
                    color: '#0f172a',
                    letterSpacing: '-0.025em',
                  }}
                >
                  Welcome Back
                </h2>
                <p className="text-muted mb-0" style={{ fontSize: '0.86rem' }}>
                  Sign in with your corporate credentials to continue
                </p>
              </div>

              {/* Error Alert Display */}
              {error && (
                <div
                  className="alert alert-danger alert-dismissible fade show small py-2.5 px-3 border-0 shadow-sm d-flex align-items-center mb-3"
                  role="alert"
                  style={{
                    borderRadius: '10px',
                    backgroundColor: '#fef2f2',
                    color: '#991b1b',
                    border: '1px solid #fecaca',
                  }}
                >
                  <span className="flex-grow-1" style={{ fontSize: '0.84rem' }}>{error}</span>
                  <button
                    type="button"
                    className="btn-close shadow-none p-2"
                    aria-label="Close"
                    onClick={() => dispatch(clearAuthError())}
                  />
                </div>
              )}

              {/* Credentials Form */}
              <form onSubmit={handleSubmit}>
                {/* Field 1: Corporate Email / Employee ID */}
                <div className="mb-3">
                  <label
                    htmlFor="sseEmailInput"
                    className="d-flex align-items-center gap-1.5 mb-1.5 fw-semibold"
                    style={{ fontSize: '0.84rem', color: '#334155' }}
                  >
                    <Mail size={14} color="#64748b" />
                    <span>Corporate Email or Employee ID</span>
                  </label>
                  <div className="sse-input-container">
                    <Mail size={17} color="#94a3b8" className="me-2.5 flex-shrink-0" />
                    <input
                      id="sseEmailInput"
                      type="text"
                      className="sse-input-field"
                      placeholder="name@company.com or EMP-001"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setActiveQuickRole(null);
                      }}
                      required
                      disabled={loading}
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Field 2: Password with Forgot Password link */}
                <div className="mb-3.5">
                  <div className="d-flex justify-content-between align-items-center mb-1.5">
                    <label
                      htmlFor="ssePasswordInput"
                      className="d-flex align-items-center gap-1.5 mb-0 fw-semibold"
                      style={{ fontSize: '0.84rem', color: '#334155' }}
                    >
                      <Lock size={14} color="#64748b" />
                      <span>Password</span>
                    </label>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none border-0 shadow-none fw-semibold"
                      style={{ fontSize: '0.82rem', color: '#0052cc' }}
                      onClick={() => setShowForgotModal(true)}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="sse-input-container">
                    <Lock size={17} color="#94a3b8" className="me-2.5 flex-shrink-0" />
                    <input
                      id="ssePasswordInput"
                      type={showPassword ? 'text' : 'password'}
                      className="sse-input-field"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setActiveQuickRole(null);
                      }}
                      required
                      disabled={loading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="btn btn-sm text-muted border-0 p-0 shadow-none ms-2"
                      onClick={() => setShowPassword((prev) => !prev)}
                      tabIndex="-1"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
                    </button>
                  </div>
                </div>

                {/* Checkbox: Remember Device */}
                <div className="d-flex align-items-center mb-3.5">
                  <input
                    id="sseRememberCheck"
                    type="checkbox"
                    className="form-check-input mt-0 me-2 shadow-none cursor-pointer"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{
                      cursor: 'pointer',
                      borderColor: '#cbd5e1',
                      borderRadius: '4px',
                    }}
                  />
                  <label
                    htmlFor="sseRememberCheck"
                    className="small text-muted mb-0 user-select-none cursor-pointer"
                    style={{ fontSize: '0.83rem', cursor: 'pointer', color: '#475569' }}
                  >
                    Remember this device for 30 days
                  </label>
                </div>

                {/* Primary Sign In Button */}
                <button
                  type="submit"
                  className="sse-btn-primary mb-3.5"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2 text-white" role="status" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <span>Sign In to ERP</span>
                      <ArrowRight size={17} strokeWidth={2.4} />
                    </>
                  )}
                </button>
              </form>

              {/* Or Quick Access Divider */}
              <div className="d-flex align-items-center my-3">
                <div className="flex-grow-1" style={{ height: '1px', backgroundColor: '#e2e8f0' }} />
                <span
                  className="px-2.5 text-muted fw-semibold text-uppercase"
                  style={{ fontSize: '10.5px', letterSpacing: '0.08em', color: '#94a3b8' }}
                >
                  Or Quick Access
                </span>
                <div className="flex-grow-1" style={{ height: '1px', backgroundColor: '#e2e8f0' }} />
              </div>

              {/* 3 Quick Access Test Buttons in a Neat Row */}
              <div className="row g-2 mb-3.5">
                {QUICK_ROLES.map((role) => {
                  const RoleIcon = role.icon;
                  const isActive = activeQuickRole === role.id;
                  return (
                    <div key={role.id} className="col-4">
                      <button
                        type="button"
                        className={`sse-quick-btn ${isActive ? 'active-quick' : ''}`}
                        onClick={() => handleQuickFill(role)}
                        title={`Fill test credentials for ${role.roleName}`}
                      >
                        <RoleIcon size={20} color={isActive ? '#0052cc' : '#0066fe'} strokeWidth={2.1} />
                        <span className="sse-quick-label">{role.label}</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Security Badge & Copyright Footer */}
              <div className="text-center pt-2">
                <div
                  className="d-flex align-items-center justify-content-center gap-1.5 mb-1"
                  style={{ fontSize: '11px', color: '#64748b' }}
                >
                  <ShieldCheck size={14} color="#0052cc" className="flex-shrink-0" />
                  <span>Protected by Dual-Token JWT & Action-Level RBAC</span>
                </div>
                <p className="mb-0" style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                  © {new Date().getFullYear()} Satya Sai Electricals (SSE). All rights reserved.
                </p>
              </div>
            </div>
          </div>

          {/* MOBILE FEATURE CARDS (Visible only on < 992px, below login card) */}
          <div className="d-lg-none col-12 mt-3 pb-3">
            <div className="text-center mb-2.5">
              <span className="badge bg-white text-primary border shadow-sm px-3 py-1.5 rounded-pill fw-semibold" style={{ fontSize: '11px' }}>
                Key Platform Modules
              </span>
            </div>
            <div className="row g-2 justify-content-center">
              {FEATURE_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.id} className="col-6 col-sm-6">
                    <div className="sse-mobile-feature-card">
                      <div className="sse-feature-icon-box">
                        <Icon size={18} strokeWidth={2.2} />
                      </div>
                      <span className="sse-feature-label">{card.shortTitle}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          MODAL: Forgot Password / IT Helpdesk Dialog
          ────────────────────────────────────────────────────────── */}
      {showForgotModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            zIndex: 9999,
            backdropFilter: 'blur(4px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForgotModal(false);
          }}
        >
          <div
            className="bg-white rounded-4 shadow-lg p-4 w-100 position-relative erp-fade-in"
            style={{ maxWidth: '440px', border: '1px solid #e2e8f0' }}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center gap-2">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: '32px', height: '32px', backgroundColor: '#eff6ff', color: '#0052cc' }}
                >
                  <HelpCircle size={18} />
                </div>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>
                  Password Recovery
                </h5>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-light rounded-circle p-1"
                onClick={() => setShowForgotModal(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <p className="small text-muted mb-3" style={{ lineHeight: 1.55 }}>
              For enterprise zero-trust security, credentials and MFA resets are managed by your System Super Administrator or IT Operations:
            </p>

            <div className="p-3 rounded-3 bg-light border mb-3 small" style={{ fontSize: '0.84rem' }}>
              <div className="mb-1.5 d-flex justify-content-between">
                <span className="text-muted">IT Helpdesk:</span>
                <span className="fw-semibold text-dark">support@satyasaielectricals.com</span>
              </div>
              <div className="mb-1.5 d-flex justify-content-between">
                <span className="text-muted">HR Operations:</span>
                <span className="fw-semibold text-dark">hr@satyasaielectricals.com</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Default Super Admin:</span>
                <span className="fw-semibold text-primary">admin@erp.com</span>
              </div>
            </div>

            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary w-50 btn-sm rounded-3 py-2 fw-semibold"
                onClick={() => {
                  handleQuickFill(QUICK_ROLES[2]);
                  setShowForgotModal(false);
                }}
              >
                Fill Admin Login
              </button>
              <button
                type="button"
                className="btn btn-primary w-50 btn-sm rounded-3 py-2 fw-semibold"
                style={{ backgroundColor: '#0052cc', borderColor: '#0052cc' }}
                onClick={() => setShowForgotModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
