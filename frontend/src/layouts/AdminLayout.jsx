import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';

// Unified ERP Design Tokens
const THEME = {
  navy: '#071A33',
  primary: '#087FF5',
  border: '#E2E8F0',
  surface: '#F4F7FB',
  cardBg: '#FFFFFF',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
};

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
  const location = useLocation();

  // Screen resize listener
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-close mobile sidebar when navigating routes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const toggleMobileSidebar = () => setSidebarOpen((prev) => !prev);
  const closeMobileSidebar = () => setSidebarOpen(false);
  const toggleDesktopSidebar = () => setSidebarCollapsed((prev) => !prev);

  // Dynamic Page Title
  const getPageTitle = (pathname) => {
    if (pathname.includes('/attendance')) return 'Employee Attendance & Shift Telemetry';
    if (pathname.includes('/dashboard')) return 'Executive Dashboard & Overview';
    if (pathname.includes('/users')) return 'Workforce Directory & User Control';
    if (pathname.includes('/roles')) return 'Roles & Dynamic Access Permissions';
    if (pathname.includes('/modules')) return 'Enterprise System Modules';
    if (pathname.includes('/companies')) return 'Client Companies & Subsidiaries';
    if (pathname.includes('/tickets')) return 'Service Desk & Support Tickets';
    if (pathname.includes('/leaves')) return 'Leave Applications & Sanctions';
    if (pathname.includes('/expenses')) return 'Expense Reimbursements & Ledger';
    if (pathname.includes('/salary')) return 'Payroll & Compensation Management';
    if (pathname.includes('/calendar')) return 'Corporate Timetable & Events';
    if (pathname.includes('/audit-logs')) return 'Security Audit & Compliance Logs';
    if (pathname.includes('/settings')) return 'Global Enterprise Configuration';
    return 'ERP Enterprise Portal';
  };

  const desktopSidebarWidth = sidebarCollapsed ? 78 : 260;

  return (
    <div
      className="d-flex vh-100 overflow-hidden position-relative"
      style={{ backgroundColor: THEME.surface, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
    >
      {/* Mobile Backdrop Overlay */}
      {isMobile && sidebarOpen && (
        <div
          onClick={closeMobileSidebar}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(7, 26, 51, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 1040,
            animation: 'fadeInOverlay 0.2s ease-out'
          }}
        />
      )}

      {/* Synchronized Sidebar Aside Wrapper */}
      <aside
        style={{
          position: isMobile ? 'fixed' : 'relative',
          top: 0,
          left: 0,
          height: '100vh',
          zIndex: isMobile ? 1050 : 100,
          width: isMobile ? '280px' : `${desktopSidebarWidth}px`,
          minWidth: isMobile ? '280px' : `${desktopSidebarWidth}px`,
          maxWidth: isMobile ? '280px' : `${desktopSidebarWidth}px`,
          transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isMobile && sidebarOpen ? '6px 0 25px rgba(0,0,0,0.25)' : 'none',
          backgroundColor: '#071A33',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <Sidebar
          isOpen={sidebarOpen}
          onClose={closeMobileSidebar}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleDesktopSidebar}
          isMobile={isMobile}
        />
      </aside>

      {/* Main App Content Viewport */}
      <div
        className="d-flex flex-column flex-grow-1 overflow-hidden h-100"
        style={{
          width: isMobile ? '100%' : `calc(100% - ${desktopSidebarWidth}px)`,
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          backgroundColor: THEME.surface,
        }}
      >
        {/* Sticky Top Navbar */}
        <header
          className="shadow-sm position-relative"
          style={{
            backgroundColor: THEME.cardBg,
            borderBottom: `1px solid ${THEME.border}`,
            zIndex: 90,
          }}
        >
          <Navbar
            onToggleMobileSidebar={toggleMobileSidebar}
            pageTitle={getPageTitle(location.pathname)}
          />
        </header>

        {/* Dynamic Route Viewport */}
        <main
          className="flex-grow-1 overflow-auto p-3 p-md-4"
          style={{
            backgroundColor: THEME.surface,
            color: THEME.textPrimary,
            scrollbarWidth: 'thin',
            scrollbarColor: '#CBD5E1 transparent',
          }}
        >
          <div className="container-fluid p-0" style={{ maxWidth: '1680px', margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>

      <style>{`
        main::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        main::-webkit-scrollbar-track {
          background: transparent;
        }
        main::-webkit-scrollbar-thumb {
          background-color: #CBD5E1;
          border-radius: 4px;
        }
        main::-webkit-scrollbar-thumb:hover {
          background-color: #94A3B8;
        }
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;