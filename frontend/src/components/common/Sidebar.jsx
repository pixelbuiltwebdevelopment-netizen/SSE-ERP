import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  LayoutGrid,
  Users,
  ShieldCheck,
  Layers,
  Building2,
  Ticket,
  Clock,
  CalendarCheck,
  CalendarDays,
  Receipt,
  Wallet,
  FileSearch,
  Settings,
  Coins,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../hooks/useAuth';
import { logoutUser } from '../../store/slices/authSlice';
import './Sidebar.css';

const NAVIGATION_GROUPS = [
  {
    groupTitle: 'WORKSPACE',
    groupIcon: LayoutGrid,
    items: [
      { title: 'Dashboard', path: '/dashboard', module: 'dashboard', icon: LayoutGrid, alwaysVisible: true },
    ],
  },
  {
    groupTitle: 'ORGANIZATION',
    groupIcon: Building2,
    items: [
      { title: 'Workforce & Users', path: '/users', module: 'users', icon: Users },
      { title: 'Roles & Permissions', path: '/roles', module: 'roles', icon: ShieldCheck },
      { title: 'System Modules', path: '/modules', module: 'modules', icon: Layers },
      { title: 'Company Profiles', path: '/companies', module: 'companies', icon: Building2 },
    ],
  },
  {
    groupTitle: 'OPERATIONS',
    groupIcon: Settings,
    items: [
      { title: 'Service Tickets', path: '/tickets', module: 'tickets', action: 'view', icon: Ticket },
      { title: 'Attendance', path: '/attendance', module: 'attendance', action: 'view_own', icon: Clock, alwaysVisible: true },
      { title: 'Leave Management', path: '/leaves', module: 'leaves', action: 'view', icon: CalendarCheck, alwaysVisible: true },
      { title: 'Corporate Calendar', path: '/calendar', module: 'calendar', action: 'view', icon: CalendarDays, alwaysVisible: true },
    ],
  },
  {
    groupTitle: 'FINANCE',
    groupIcon: Coins,
    items: [
      { title: 'Expenses & Advances', path: '/expenses', module: 'expenses', action: 'view', icon: Receipt, alwaysVisible: true },
      { title: 'Payroll & Salary', path: '/salary', module: 'salary', action: 'view', icon: Wallet, alwaysVisible: true },
    ],
  },
  {
    groupTitle: 'GOVERNANCE',
    groupIcon: ShieldCheck,
    items: [
      { title: 'Security Audit Logs', path: '/audit-logs', module: 'audit-logs', icon: FileSearch },
    ],
  },
];

const Sidebar = ({ isOpen = false, onClose, isCollapsed, onToggleCollapse, isMobile }) => {
  const { can } = usePermission();
  const { isSuperAdmin, user } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [hoveredTooltip, setHoveredTooltip] = useState(null);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  const showExpandedText = isMobile ? true : !isCollapsed;

  const userInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : 'S';
  const userDisplayName = user?.name || (isSuperAdmin ? 'System Super Admin' : 'Authorized User');
  const userRoleName = user?.roleId?.name || (isSuperAdmin ? 'Super Admin' : 'Staff');

  return (
    <div className="sse-sidebar">
      {/* ──────────────────────────────────────────────────────────
          1. TOP BRAND HEADER
          ────────────────────────────────────────────────────────── */}
      <div className="sse-sidebar-header">
        {/* Transmission Lattice Tower Watermark Graphic */}
        

        <Link
          to="/dashboard"
          className="d-flex align-items-center text-decoration-none overflow-hidden"
          onClick={onClose}
          style={{ gap: '12px', zIndex: 3 }}
        >
          {/* Logo Brand Emblem */}
          <div className="sse-sidebar-logo-container">
            <img
              src="/logo.png"
              alt="SSE Logo"
            />
          </div>

          {/* Brand Titles */}
          {showExpandedText && (
            <div className="d-flex flex-column justify-content-center text-truncate erp-fade-in">
              <span
                className="fw-bold text-white lh-sm text-truncate"
                style={{ fontSize: '1.05rem', letterSpacing: '0.03em' }}
              >
                SSE <span style={{ color: '#00e5ff' }}>ERP</span>
              </span>
              <span
                className="text-uppercase fw-bold"
                style={{
                  fontSize: '9px',
                  letterSpacing: '0.12em',
                  color: '#94a3b8',
                  marginTop: '2px',
                }}
              >
                SATYA SAI ELECTRICALS
              </span>
            </div>
          )}
        </Link>

        {/* Mobile Close Button */}
        {isMobile && (
          <button
            type="button"
            className="btn btn-sm text-white p-1 d-flex align-items-center justify-content-center rounded-2 border-0"
            onClick={onClose}
            aria-label="Close Sidebar"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', zIndex: 3 }}
          >
            <X size={18} />
          </button>
        )}

        {/* Desktop Collapse Arrow Button */}
        {!isMobile && (
          <button
            type="button"
            className="btn btn-sm border-0 d-flex align-items-center justify-content-center position-absolute shadow-sm"
            onClick={onToggleCollapse}
            style={{
              right: '-13px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 1060,
              background: 'linear-gradient(135deg, #0088ff 0%, #00d2ff 100%)',
              color: '#FFFFFF',
              borderRadius: '50%',
              width: '26px',
              height: '26px',
              cursor: 'pointer',
              border: '2px solid #07152b',
              boxShadow: '0 2px 10px rgba(0, 194, 255, 0.5), 0 0 0 1px rgba(0, 229, 255, 0.35)',
              padding: 0,
            }}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight size={14} strokeWidth={3} />
            ) : (
              <ChevronLeft size={14} strokeWidth={3} />
            )}
          </button>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────
          2. NAVIGATION MENU GROUPS
          ────────────────────────────────────────────────────────── */}
      <div className="px-3 py-2 flex-grow-1 overflow-x-hidden overflow-y-auto position-relative" style={{ zIndex: 2 }}>
        {NAVIGATION_GROUPS.map((group, gIdx) => {
          const GroupIcon = group.groupIcon;
          const visibleItems = group.items.filter((item) => {
            return item.alwaysVisible || isSuperAdmin || can(item.module, item.action || 'view');
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={gIdx} className="mb-2">
              {showExpandedText ? (
                <div className="sse-sidebar-section-header">
                  <div className="sse-sidebar-section-icon">
                    <GroupIcon size={14} strokeWidth={2.2} />
                  </div>
                  <span className="sse-sidebar-section-title">{group.groupTitle}</span>
                  <div className="sse-sidebar-section-line" />
                </div>
              ) : (
                <div
                  className="my-3 mx-auto"
                  style={{
                    width: '28px',
                    height: '1px',
                    backgroundColor: 'rgba(0, 194, 255, 0.25)',
                  }}
                />
              )}

              <ul className="list-unstyled mb-0 d-flex flex-column gap-1">
                {visibleItems.map((item) => {
                  const ItemIcon = item.icon;

                  return (
                    <li
                      className="sse-sidebar-nav-item position-relative"
                      key={item.path}
                      onMouseEnter={() => !showExpandedText && setHoveredTooltip(item.title)}
                      onMouseLeave={() => !showExpandedText && setHoveredTooltip(null)}
                    >
                      <NavLink
                        to={item.path}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `sse-sidebar-nav-link ${
                            !showExpandedText ? 'justify-content-center px-0' : ''
                          } ${isActive ? 'active' : ''}`
                        }
                      >
                        <div className="sse-nav-icon">
                          <ItemIcon size={18} strokeWidth={2.1} />
                        </div>

                        {showExpandedText && (
                          <>
                            <span className="sse-nav-text">{item.title}</span>
                            <ChevronRight size={14} strokeWidth={2.4} className="sse-nav-chevron" />
                          </>
                        )}
                      </NavLink>

                      {/* Tooltip on Collapsed Mode */}
                      {!showExpandedText && hoveredTooltip === item.title && (
                        <div
                          className="position-absolute shadow-lg px-2.5 py-1.5 rounded-2 text-white text-nowrap fw-semibold"
                          style={{
                            left: 'calc(100% + 14px)',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            backgroundColor: '#07152b',
                            border: '1px solid #00c2ff',
                            fontSize: '0.78rem',
                            zIndex: 9999,
                            pointerEvents: 'none',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
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
          );
        })}
      </div>

      {/* ──────────────────────────────────────────────────────────
          3. USER PROFILE CAPSULE & LOGOUT (Bottom)
          ────────────────────────────────────────────────────────── */}
      <div className="mt-auto position-relative" style={{ zIndex: 3 }}>
        {showExpandedText ? (
          <div className="sse-sidebar-user-card">
            {/* Avatar */}
            <div className="sse-user-avatar">
              {userInitial}
            </div>

            {/* Name & Role */}
            <div className="sse-user-meta">
              <p className="sse-user-name">{userDisplayName}</p>
              <p className="sse-user-role">{userRoleName}</p>
            </div>

            {/* Logout Action */}
            <button
              type="button"
              className="sse-logout-btn"
              onClick={handleLogout}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={16} strokeWidth={2.2} />
            </button>
          </div>
        ) : (
          <div className="p-2 d-flex flex-column align-items-center gap-2 mb-2">
            <div className="sse-user-avatar" title={`${userDisplayName} (${userRoleName})`}>
              {userInitial}
            </div>
            <button
              type="button"
              className="sse-logout-btn"
              onClick={handleLogout}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={16} strokeWidth={2.2} />
            </button>
          </div>
        )}

        {/* Bottom Glowing Wave Swoosh Graphic */}
        <svg
          className="sse-sidebar-bottom-wave"
          viewBox="0 0 300 85"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="sideBottomWaveGrad1" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0048b3" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#0080ff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="sideBottomWaveGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#002255" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#005cd6" stopOpacity="0.35" />
            </linearGradient>
          </defs>
          <path d="M 0 45 C 80 50, 160 20, 300 5 L 300 85 L 0 85 Z" fill="url(#sideBottomWaveGrad2)" />
          <path d="M 0 60 C 90 65, 170 35, 300 15 L 300 85 L 0 85 Z" fill="url(#sideBottomWaveGrad1)" />
        </svg>
      </div>
    </div>
  );
};

export default Sidebar;
