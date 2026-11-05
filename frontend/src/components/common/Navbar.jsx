import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../providers/SocketProvider';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  CheckCircle2,
  Calendar,
  Wifi,
  WifiOff,
  User,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { logoutUser } from '../../store/slices/authSlice';

const Navbar = ({
  onToggleMobileSidebar,
  onToggleDesktopSidebar,
  isSidebarCollapsed = false,
  isMobile = false,
  pageTitle = 'Dashboard',
}) => {
  const { user } = useAuth();
  const socket = useSocket();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  const location = useLocation();
  const isDashboard = location.pathname.includes('/dashboard') || location.pathname === '/';

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';
  const displayTitle = isDashboard ? `${greeting}, ${user?.name || 'Administrator'}` : pageTitle;
  const displaySubtitle = isDashboard
    ? `${user?.roleId?.name || 'Staff'} • Enterprise Resources Planning`
    : 'Enterprise Resource Planning';

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className="d-flex align-items-center justify-content-between px-3 px-md-4 py-2"
      style={{
        backgroundColor: '#ffffff',
        minHeight: '64px',
        width: '100%',
      }}
    >
      {/* ── Left: Sidebar Trigger & Breadcrumb Page Title ── */}
      <div className="d-flex align-items-center gap-2 gap-md-3 overflow-hidden">
        

        <div className="text-truncate">
          <div className="d-flex align-items-center gap-2">
            <h5
              className="mb-0 fw-bold text-truncate"
              style={{
                color: 'var(--erp-text-main)',
                fontSize: '1rem',
                letterSpacing: '-0.02em',
              }}
            >
              {displayTitle}
            </h5>
          </div>
          <small
            className="d-none d-md-block text-truncate text-muted"
            style={{ fontSize: '0.725rem' }}
          >
            {displaySubtitle}
          </small>
        </div>
      </div>

      {/* ── Right: Live Date, WebSocket Pill & User Menu ── */}
      <div className="d-flex align-items-center gap-2 gap-sm-3 flex-shrink-0">
        {/* Date Display */}
        <div
          className="d-none d-lg-flex align-items-center gap-1.5 px-2.5 py-1 rounded-pill small"
          style={{
            backgroundColor: 'var(--erp-surface-subtle)',
            color: 'var(--erp-text-secondary)',
            fontSize: '0.775rem',
            fontWeight: 500,
          }}
        >
          <Calendar size={13} className="text-primary" />
          <span>{formattedDate}</span>
        </div>

        {/* Real-Time WebSocket Pill */}
        <div
          className="d-none d-sm-flex align-items-center gap-1 px-2.5 py-1 rounded-pill small"
          style={{
            backgroundColor: socket?.connected ? 'var(--erp-success-bg)' : 'var(--erp-surface-subtle)',
            border: `1px solid ${socket?.connected ? 'var(--erp-success-border)' : 'var(--erp-border)'}`,
            color: socket?.connected ? 'var(--erp-success-text)' : 'var(--erp-text-muted)',
            fontSize: '0.725rem',
            fontWeight: 600,
          }}
          title={socket?.connected ? 'WebSocket connected and streaming live' : 'Connecting to real-time events...'}
        >
          {socket?.connected ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span>{socket?.connected ? 'Live Sync' : 'Offline'}</span>
        </div>

        {/* User Capsule & Quick Menu */}
        <div className="position-relative" ref={userMenuRef}>
          <div
            className="d-flex align-items-center gap-2 p-1 pe-2 rounded-pill shadow-xs"
            style={{
              backgroundColor: 'var(--erp-surface)',
              border: '1px solid var(--erp-border)',
              cursor: 'pointer',
            }}
            onClick={() => setShowUserMenu((prev) => !prev)}
          >
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-xs"
              style={{
                width: '30px',
                height: '30px',
                backgroundColor: 'var(--erp-primary)',
                fontSize: '0.8rem',
                flexShrink: 0,
              }}
            >
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>

            <div className="d-none d-sm-block text-truncate" style={{ maxWidth: '120px', lineHeight: 1.2 }}>
              <div
                className="fw-semibold text-truncate"
                style={{ color: 'var(--erp-text-main)', fontSize: '0.78rem' }}
              >
                {user?.name || 'Administrator'}
              </div>
              <div
                className="text-muted text-truncate"
                style={{ fontSize: '0.68rem', textTransform: 'capitalize' }}
              >
                {user?.roleId?.name || 'Staff'}
              </div>
            </div>

            <ChevronDown size={14} className="text-muted d-none d-sm-block ms-0.5" />
          </div>

          {/* User Profile Dropdown Menu */}
          {showUserMenu && (
            <div
              className="position-absolute end-0 mt-2 shadow-xl rounded-3 erp-slide-down"
              style={{
                width: '210px',
                backgroundColor: '#ffffff',
                border: '1px solid var(--erp-border)',
                zIndex: 1070,
                padding: '0.35rem',
              }}
            >
              <div className="px-3 py-2 border-bottom mb-1">
                <div className="fw-bold small text-truncate" style={{ color: 'var(--erp-text-main)' }}>
                  {user?.name}
                </div>
                <div className="text-muted small text-truncate" style={{ fontSize: '0.72rem' }}>
                  {user?.email}
                </div>
              </div>

              <Link
                to="/settings"
                className="d-flex align-items-center gap-2 px-3 py-2 text-decoration-none rounded-2 small text-secondary"
                style={{ fontSize: '0.8rem' }}
                onClick={() => setShowUserMenu(false)}
              >
                <Settings size={15} />
                <span>Account Settings</span>
              </Link>

              <button
                type="button"
                className="d-flex align-items-center gap-2 px-3 py-2 w-100 text-danger border-0 bg-transparent rounded-2 small text-start"
                style={{ fontSize: '0.8rem' }}
                onClick={handleLogout}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
