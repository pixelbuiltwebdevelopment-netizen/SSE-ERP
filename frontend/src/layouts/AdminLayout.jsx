import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';

const AdminLayout = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
  const location = useLocation();

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
    if (pathname.includes('/dashboard')) {
      const hr = new Date().getHours();
      const greeting = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
      return `${greeting}, ${user?.name || 'Administrator'}`;
    }
    if (pathname.includes('/attendance')) return 'Employee Attendance & Telemetry';
    if (pathname.includes('/users')) return 'Workforce Directory & Users';
    if (pathname.includes('/roles')) return 'Roles & Dynamic Permissions';
    if (pathname.includes('/modules')) return 'Enterprise System Modules';
    if (pathname.includes('/companies')) return 'Client Companies & Machines';
    if (pathname.includes('/tickets')) return 'Service Desk & Field Tickets';
    if (pathname.includes('/leaves')) return 'Leave Management & Sanctions';
    if (pathname.includes('/expenses')) return 'Expenses & Advance Ledger';
    if (pathname.includes('/salary')) return 'Payroll & Compensation';
    if (pathname.includes('/calendar')) return 'Corporate Calendar & Timetable';
    if (pathname.includes('/audit-logs')) return 'Security Audit & Compliance';
    if (pathname.includes('/settings')) return 'Enterprise Settings';
    return 'ERP Enterprise Suite';
  };

  const desktopSidebarWidth = sidebarCollapsed ? 76 : 268;

  return (
    <div className="d-flex vh-100 overflow-hidden position-relative" style={{ backgroundColor: 'var(--erp-bg)' }}>
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
            backgroundColor: 'rgba(11, 19, 43, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 1040,
            animation: 'erpFadeIn 0.2s ease-out',
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
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isMobile && sidebarOpen ? '6px 0 25px rgba(0,0,0,0.25)' : 'none',
          backgroundColor: 'var(--erp-sidebar-bg)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflow: 'visible',
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
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          backgroundColor: 'var(--erp-bg)',
        }}
      >
        {/* Sticky Top Navbar */}
        <header
          className="shadow-xs position-relative"
          style={{
            backgroundColor: '#ffffff',
            borderBottom: '1px solid var(--erp-border)',
            zIndex: 90,
          }}
        >
          <Navbar
            onToggleMobileSidebar={toggleMobileSidebar}
            onToggleDesktopSidebar={toggleDesktopSidebar}
            isSidebarCollapsed={sidebarCollapsed}
            isMobile={isMobile}
            pageTitle={getPageTitle(location.pathname)}
          />
        </header>

        {/* Dynamic Route Viewport */}
        <main
          className="flex-grow-1 overflow-auto px-3 px-md-4 px-xl-5 py-3 py-md-4"
          style={{
            backgroundColor: 'var(--erp-bg)',
            color: 'var(--erp-text-main)',
          }}
        >
          <div className="container-fluid p-0" style={{ maxWidth: '1680px', margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
