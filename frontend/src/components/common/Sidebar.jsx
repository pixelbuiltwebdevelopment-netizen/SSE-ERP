import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../hooks/useAuth';
import { logoutUser } from '../../store/slices/authSlice';

// Self-Contained Enterprise SVG Icons
const SidebarIcons = {
  Dashboard: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="3" width="7" height="9" rx="1"></rect>
      <rect x="14" y="3" width="7" height="5" rx="1"></rect>
      <rect x="14" y="12" width="7" height="9" rx="1"></rect>
      <rect x="3" y="16" width="7" height="5" rx="1"></rect>
    </svg>
  ),
  Users: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  ),
  Roles: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      <rect x="9" y="8" width="6" height="5" rx="1"></rect>
      <path d="M10 8V6a2 2 0 1 1 4 0v2"></path>
    </svg>
  ),
  Modules: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
      <polyline points="2 17 12 22 22 17"></polyline>
      <polyline points="2 12 12 17 22 12"></polyline>
    </svg>
  ),
  Companies: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
      <path d="M9 22v-4h6v4"></path>
      <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"></path>
    </svg>
  ),
  Tickets: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
    </svg>
  ),
  Attendance: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  ),
  Leaves: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
      <polyline points="9 16 11 18 15 14"></polyline>
    </svg>
  ),
  Expenses: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="2" y="4" width="20" height="16" rx="2"></rect>
      <line x1="2" y1="10" x2="22" y2="10"></line>
      <circle cx="16" cy="15" r="1.5"></circle>
    </svg>
  ),
  Salary: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="2" y="6" width="20" height="12" rx="2"></rect>
      <circle cx="12" cy="12" r="2.5"></circle>
      <path d="M6 12h.01M18 12h.01"></path>
    </svg>
  ),
  Calendar: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  ),
  AuditLogs: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  ),
  Settings: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  ),
  SignOut: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
  ),
  Close: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  ),
  ChevronRight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  )
};

const Sidebar = ({ isOpen = false, onClose, isCollapsed, onToggleCollapse, isMobile }) => {
  const { can } = usePermission();
  const { isSuperAdmin, user } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [hoveredItem, setHoveredItem] = useState(null);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  const menuItems = [
    { title: 'Dashboard', path: '/dashboard', module: 'dashboard', Icon: SidebarIcons.Dashboard },
    { title: 'User Management', path: '/users', module: 'users', Icon: SidebarIcons.Users },
    { title: 'Role & Permissions', path: '/roles', module: 'roles', Icon: SidebarIcons.Roles },
    { title: 'Module Management', path: '/modules', module: 'modules', Icon: SidebarIcons.Modules },
    { title: 'Company Profiles', path: '/companies', module: 'companies', Icon: SidebarIcons.Companies },
    { title: 'Service Tickets', path: '/tickets', module: 'tickets', action: 'view', Icon: SidebarIcons.Tickets },
    { title: 'Attendance', path: '/attendance', module: 'attendance', action: 'view_own', Icon: SidebarIcons.Attendance, alwaysVisible: true },
    { title: 'Leave Management', path: '/leaves', module: 'leaves', action: 'view', Icon: SidebarIcons.Leaves, alwaysVisible: true },
    { title: 'Expenses & Advances', path: '/expenses', module: 'expenses', action: 'view', Icon: SidebarIcons.Expenses, alwaysVisible: true },
    { title: 'Salary & Advances', path: '/salary', module: 'salary', action: 'view', Icon: SidebarIcons.Salary, alwaysVisible: true },
    { title: 'Calendar & Events', path: '/calendar', module: 'calendar', action: 'view', Icon: SidebarIcons.Calendar, alwaysVisible: true },
    { title: 'Audit Logs', path: '/audit-logs', module: 'audit-logs', Icon: SidebarIcons.AuditLogs },
  ];

  // Mobile mode is always fully expanded
  const showExpandedText = isMobile ? true : !isCollapsed;

  return (
    <div 
      className="d-flex flex-column h-100 w-100 position-relative user-select-none"
      style={{
        backgroundColor: '#071A33',
        color: '#F4F7FB',
        borderRight: '1px solid rgba(226, 232, 240, 0.08)',
      }}
    >
      {/* ── 1. Top Brand Header (Aligned Logo + Text) ── */}
      <div 
        className="d-flex align-items-center justify-content-between px-3 position-relative" 
        style={{ 
          borderBottom: '1px solid rgba(226, 232, 240, 0.08)', 
          height: '70px',
          minHeight: '70px'
        }}
      >
        <Link 
          to="/dashboard" 
          className="d-flex align-items-center text-decoration-none overflow-hidden" 
          onClick={onClose}
          style={{ gap: '12px' }}
        >
          {/* Logo Container */}
          <div 
            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{ 
              width: '40px', 
              height: '40px', 
              backgroundColor: 'rgba(8, 127, 245, 0.14)',
              border: '1px solid rgba(8, 127, 245, 0.25)',
              padding: '6px'
            }}
          >
            <img 
              src="/src/assets/logo.png" 
              alt="Logo" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />
          </div>
          
          {/* Title and Subtitle Block */}
          {showExpandedText && (
            <div className="d-flex flex-column justify-content-center text-truncate animate-fade-in">
              <span 
                className="fw-bold text-white lh-sm text-truncate" 
                style={{ fontSize: '0.94rem', letterSpacing: '0.3px' }}
              >
                ERP <span style={{ color: '#087FF5' }}>ENTERPRISE</span>
              </span>
              <span 
                className="text-uppercase fw-semibold" 
                style={{ fontSize: '0.64rem', letterSpacing: '1px', color: '#64748B', marginTop: '2px' }}
              >
                Management Hub
              </span>
            </div>
          )}
        </Link>

        {/* Mobile Close Button */}
        {isMobile && (
          <button 
            type="button"
            className="btn btn-link text-white p-1.5 d-flex align-items-center justify-content-center rounded-2" 
            onClick={onClose}
            aria-label="Close Sidebar"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', textDecoration: 'none' }}
          >
            <SidebarIcons.Close />
          </button>
        )}

        {/* Desktop Collapse Arrow Button */}
        {!isMobile && (
          <button 
            type="button"
            className="btn btn-sm border-0 d-flex align-items-center justify-content-center position-absolute" 
            onClick={onToggleCollapse}
            style={{ 
              right: '-13px', 
              top: '50%',
              transform: 'translateY(-50%)', 
              zIndex: 1060, 
              backgroundColor: '#087FF5', 
              color: '#FFFFFF',
              borderRadius: '50%', 
              width: '26px', 
              height: '26px', 
              boxShadow: '0 2px 8px rgba(8, 127, 245, 0.4)',
              transition: 'all 0.2s ease'
            }}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <SidebarIcons.ChevronRight /> : <SidebarIcons.ChevronLeft />}
          </button>
        )}
      </div>
      
      {/* ── 2. Navigation Menu List ── */}
      <div className="p-2 p-md-2.5 flex-grow-1 overflow-x-visible overflow-y-auto sidebar-scroll">
        {showExpandedText && (
          <small 
            className="text-uppercase fw-bold ms-2 mb-2 d-block" 
            style={{ fontSize: '0.66rem', letterSpacing: '1.2px', color: '#64748B' }}
          >
            Main Modules
          </small>
        )}

        <ul className="nav nav-pills flex-column gap-1 list-unstyled mb-0">
          {menuItems.map((item) => {
            const isPermitted = item.alwaysVisible || isSuperAdmin || can(item.module, item.action || 'view');
            if (!isPermitted) return null;

            const IconComponent = item.Icon;

            return (
              <li 
                className="nav-item position-relative" 
                key={item.path}
                onMouseEnter={() => !showExpandedText && setHoveredItem(item.title)}
                onMouseLeave={() => !showExpandedText && setHoveredItem(null)}
              >
                <NavLink
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `nav-link d-flex align-items-center position-relative ${
                      !showExpandedText ? 'justify-content-center px-0 py-2.5' : 'px-3 py-2.5'
                    } ${isActive ? 'active-link' : ''}`
                  }
                  style={({ isActive }) => ({
                    color: isActive ? '#FFFFFF' : '#CBD5E1',
                    backgroundColor: isActive ? 'rgba(8, 127, 245, 0.18)' : 'transparent',
                    borderLeft: isActive ? '3.5px solid #087FF5' : '3.5px solid transparent',
                    borderRadius: showExpandedText ? '0 8px 8px 0' : '8px',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontWeight: isActive ? '600' : '500',
                    minHeight: '44px'
                  })}
                >
                  <div className={`d-flex align-items-center justify-content-center ${showExpandedText ? 'me-3' : ''}`}>
                    <IconComponent />
                  </div>
                  
                  {showExpandedText && (
                    <span className="text-truncate" style={{ fontSize: '0.85rem' }}>
                      {item.title}
                    </span>
                  )}
                </NavLink>

                {/* Floating Tooltip in Collapsed Desktop Mode */}
                {!showExpandedText && hoveredItem === item.title && (
                  <div 
                    className="position-absolute shadow-lg px-2.5 py-1.5 rounded-2 text-white text-nowrap fw-semibold"
                    style={{
                      left: 'calc(100% + 12px)',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: '#071A33',
                      border: '1px solid rgba(8, 127, 245, 0.4)',
                      fontSize: '0.76rem',
                      zIndex: 9999,
                      pointerEvents: 'none',
                      animation: 'tooltipFade 0.18s ease-out'
                    }}
                  >
                    {item.title}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── 3. Footer / User Profile Card ── */}
      <div 
        className="mt-auto p-2 p-md-3" 
        style={{ borderTop: '1px solid rgba(226, 232, 240, 0.08)', backgroundColor: 'rgba(7, 26, 51, 0.75)' }}
      >
        {/* Settings Button */}
        <div 
          className="position-relative mb-2.5"
          onMouseEnter={() => !showExpandedText && setHoveredItem('Settings')}
          onMouseLeave={() => !showExpandedText && setHoveredItem(null)}
        >
          <NavLink 
            to="/settings" 
            onClick={onClose} 
            className={`nav-link d-flex align-items-center py-2 px-3 rounded-2 ${
              !showExpandedText ? 'justify-content-center px-0' : ''
            }`} 
            style={{ color: '#CBD5E1', transition: 'all 0.2s', minHeight: '40px' }}
          >
            <div className={`d-flex align-items-center justify-content-center ${showExpandedText ? 'me-3' : ''}`}>
              <SidebarIcons.Settings />
            </div>
            {showExpandedText && <span style={{ fontSize: '0.84rem' }}>Global Settings</span>}
          </NavLink>

          {!showExpandedText && hoveredItem === 'Settings' && (
            <div 
              className="position-absolute shadow-lg px-2.5 py-1.5 rounded-2 text-white text-nowrap fw-semibold"
              style={{
                left: 'calc(100% + 12px)',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: '#071A33',
                border: '1px solid rgba(8, 127, 245, 0.4)',
                fontSize: '0.76rem',
                zIndex: 9999,
                pointerEvents: 'none'
              }}
            >
              Global Settings
            </div>
          )}
        </div>
        
        {/* User Profile Card */}
        <div 
          className={`d-flex align-items-center ${
            !showExpandedText ? 'justify-content-center flex-column py-2.5 gap-2' : 'justify-content-between p-2.5'
          }`} 
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.04)', 
            border: '1px solid rgba(226, 232, 240, 0.09)', 
            borderRadius: '12px' 
          }}
        >
          <div className="d-flex align-items-center overflow-hidden" style={{ gap: '10px' }}>
            {/* User Avatar with Active Online Dot */}
            <div className="position-relative flex-shrink-0">
              <div 
                className="text-white rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm" 
                style={{ 
                  width: '38px', 
                  height: '38px', 
                  backgroundColor: '#087FF5', 
                  fontSize: '0.88rem',
                  border: '1.5px solid rgba(255, 255, 255, 0.15)'
                }}
              >
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span 
                className="position-absolute rounded-circle"
                style={{ 
                  width: '10px', 
                  height: '10px', 
                  backgroundColor: '#10B981',
                  border: '2px solid #071A33',
                  bottom: '0px',
                  right: '0px'
                }}
                title="Online &amp; Active"
              />
            </div>

            {/* User Full Name & Staff Role */}
            {showExpandedText && (
              <div className="d-flex flex-column justify-content-center text-truncate">
                <span 
                  className="fw-semibold text-white lh-sm text-truncate d-block" 
                  style={{ fontSize: '0.84rem' }}
                >
                  {user?.name || 'Administrator'}
                </span>
                <span 
                  className="text-muted text-truncate d-block mt-0.5" 
                  style={{ fontSize: '0.72rem', letterSpacing: '0.2px' }}
                >
                  {user?.roleId?.name || 'Authorized Staff'}
                </span>
              </div>
            )}
          </div>

          {/* Logout / Sign-Out Action */}
          <button 
            type="button"
            className="btn btn-link p-1.5 text-danger d-flex align-items-center justify-content-center rounded-2 hover-scale flex-shrink-0" 
            onClick={handleLogout} 
            title="Sign Out"
            style={{ 
              textDecoration: 'none', 
              backgroundColor: 'rgba(220, 38, 38, 0.08)',
              width: '32px',
              height: '32px'
            }}
          >
            <SidebarIcons.SignOut />
          </button>
        </div>
      </div>

      <style>{`
        .nav-link:hover:not(.active-link) {
          background-color: rgba(8, 127, 245, 0.08) !important;
          color: #FFFFFF !important;
          transform: translateX(2px);
        }
        .hover-scale {
          transition: transform 0.18s ease, background-color 0.18s ease;
        }
        .hover-scale:hover {
          transform: scale(1.1);
          background-color: rgba(220, 38, 38, 0.16) !important;
        }
        .sidebar-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(226, 232, 240, 0.15);
          border-radius: 4px;
        }
        @keyframes tooltipFade {
          from { opacity: 0; transform: translateY(-50%) translateX(-4px); }
          to { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.25s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Sidebar;