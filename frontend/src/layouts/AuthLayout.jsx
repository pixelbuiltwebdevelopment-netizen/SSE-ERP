import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div 
      className="auth-page d-flex align-items-center justify-content-center min-vh-100 position-relative overflow-hidden px-3 py-4" 
      style={{ 
        backgroundColor: '#071A33',
        backgroundImage: 'radial-gradient(circle at 50% 15%, rgba(8, 127, 245, 0.15) 0%, rgba(7, 26, 51, 1) 70%)',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* Dynamic Background Glow Blobs */}
      <div 
        className="position-absolute rounded-circle pointer-events-none"
        style={{
          width: '500px',
          height: '500px',
          top: '-150px',
          right: '-100px',
          background: 'radial-gradient(circle, rgba(8, 127, 245, 0.12) 0%, transparent 70%)',
          filter: 'blur(50px)',
          zIndex: 1
        }}
      />
      <div 
        className="position-absolute rounded-circle pointer-events-none"
        style={{
          width: '400px',
          height: '400px',
          bottom: '-100px',
          left: '-100px',
          background: 'radial-gradient(circle, rgba(0, 87, 184, 0.12) 0%, transparent 70%)',
          filter: 'blur(50px)',
          zIndex: 1
        }}
      />

      <div className="container d-flex justify-content-center position-relative" style={{ zIndex: 10 }}>
        <div 
          className="auth-card p-4 p-sm-5 w-100 shadow-lg" 
          style={{ 
            maxWidth: '460px', 
            backgroundColor: '#FFFFFF', 
            borderRadius: '20px',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: '0 20px 40px -15px rgba(7, 26, 51, 0.45)',
            animation: 'authFadeUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Logo & Brand Identity */}
          <div className="text-center mb-4">
            <div 
              className="d-inline-flex align-items-center justify-content-center mb-3 rounded-4 shadow-sm"
              style={{
                width: '68px',
                height: '68px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                padding: '10px'
              }}
            >
              <img 
                src="/src/assets/logo.png" 
                alt="ERP Management" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
              />
            </div>
            
            <h3 className="fw-bold mb-1" style={{ color: '#071A33', letterSpacing: '-0.3px', fontSize: '1.45rem' }}>
              ERP Enterprise Hub
            </h3>
            <p className="text-muted small mb-0" style={{ fontSize: '0.82rem' }}>
              Authorized Portal for Operations & Workflow Control
            </p>
          </div>

          {/* Form Content / Nested Route */}
          <Outlet />
        </div>
      </div>

      <style>{`
        @keyframes authFadeUp {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default AuthLayout;