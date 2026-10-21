import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../providers/SocketProvider';
import { getNotifications, markAsRead, markAllNotificationsAsRead } from '../../api/attendanceApi';
import { Link } from 'react-router-dom';

// ERP Design System Tokens
const THEME = {
  navy: '#0F172A',
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  border: '#E2E8F0',
  surface: '#F8FAFC',
  cardBg: '#FFFFFF',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  danger: '#EF4444',
  success: '#10B981',
};

const Navbar = ({ onToggleMobileSidebar, pageTitle = 'Dashboard' }) => {
  const { user } = useAuth();
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifs = async () => {
    try {
      const res = await getNotifications({ limit: 10 });
      if (res && res.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      // Silently catch in navbar
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  // Socket listener for live notifications
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewNotif = (notif) => {
      setNotifications((prev) => [notif, ...prev.slice(0, 9)]);
      setUnreadCount((c) => c + 1);
    };

    socket.on(`notification_${user._id}`, handleNewNotif);
    socket.on('notification_broadcast', (data) => {
      if (data.userId === user._id) {
        handleNewNotif(data.notification);
      }
    });

    return () => {
      socket.off(`notification_${user._id}`, handleNewNotif);
      socket.off('notification_broadcast');
    };
  }, [socket, user]);

  // Click outside to close notification dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {}
  };

  return (
    <div
      className="d-flex align-items-center justify-content-between px-3 px-md-4 py-2"
      style={{
        backgroundColor: THEME.cardBg,
        minHeight: '64px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Left: Mobile Drawer Trigger & Page Heading */}
      <div className="d-flex align-items-center gap-2 gap-md-3 overflow-hidden">
        <button
          className="btn d-lg-none p-1.5 d-flex align-items-center justify-content-center rounded-2 border-0"
          onClick={onToggleMobileSidebar}
          aria-label="Toggle Navigation Drawer"
          style={{
            backgroundColor: THEME.surface,
            color: THEME.navy,
            width: '38px',
            height: '38px',
          }}
        >
          <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>☰</span>
        </button>

        <div className="text-truncate">
          <div className="d-flex align-items-center gap-2">
            <h5
              className="mb-0 fw-bold text-truncate"
              style={{
                color: THEME.navy,
                fontSize: 'calc(0.95rem + 0.2vw)',
                letterSpacing: '-0.02em',
              }}
            >
              {pageTitle}
            </h5>
           
          </div>
          <small
            className="d-none d-sm-block text-truncate text-secondary mt-0.5"
            style={{ fontSize: '11px', fontWeight: 500 }}
          >
            Enterprise Operations Management Portal
          </small>
        </div>
      </div>

      {/* Right: Quick Telemetry, Notifications & User Chip */}
      <div className="d-flex align-items-center gap-2 gap-sm-3 flex-shrink-0">
        
        {/* Real-time Socket Indicator */}
        <div
          className="d-none d-md-flex align-items-center gap-1.5 px-2.5 py-1 rounded-pill"
          style={{
            backgroundColor: THEME.surface,
            border: `1px solid ${THEME.border}`,
            fontSize: '11px',
            fontWeight: 600,
            color: socket?.connected ? THEME.success : THEME.textSecondary,
          }}
          title={socket?.connected ? 'Real-time WebSocket Connected' : 'Syncing...'}
        >
         
          
        </div>

        {/* Notifications Dropdown Container */}
        <div className="position-relative" ref={dropdownRef}>
          <button
            type="button"
            className="btn position-relative rounded-circle d-flex align-items-center justify-content-center p-0"
            style={{
              width: '38px',
              height: '38px',
              backgroundColor: showNotifications ? THEME.primaryLight : THEME.surface,
              color: showNotifications ? THEME.primary : THEME.navy,
              border: `1px solid ${showNotifications ? THEME.primary : THEME.border}`,
              transition: 'all 0.15s ease-in-out',
            }}
            onClick={() => setShowNotifications((prev) => !prev)}
            aria-label="View notifications"
          >
            <span style={{ fontSize: '15px' }}>🔔</span>
            {unreadCount > 0 && (
              <span
                className="position-absolute top-0 start-100 translate-middle badge rounded-pill"
                style={{
                  backgroundColor: THEME.danger,
                  color: '#FFFFFF',
                  fontSize: '10px',
                  padding: '3px 6px',
                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Menu */}
          {showNotifications && (
            <div
              className="position-absolute end-0 mt-2 shadow-lg rounded-3"
              style={{
                width: '340px',
                maxWidth: '92vw',
                backgroundColor: THEME.cardBg,
                border: `1px solid ${THEME.border}`,
                zIndex: 1070,
                overflow: 'hidden',
                animation: 'fadeDown 0.18s ease-out forwards',
              }}
            >
              {/* Dropdown Header */}
              <div
                className="d-flex align-items-center justify-content-between px-3 py-2.5 border-bottom"
                style={{ backgroundColor: THEME.surface, borderColor: THEME.border }}
              >
                <div className="d-flex align-items-center gap-1.5">
                  <span className="fw-bold small" style={{ color: THEME.navy }}>
                    Alerts & Feeds
                  </span>
                  {unreadCount > 0 && (
                    <span
                      className="badge rounded-pill"
                      style={{ backgroundColor: THEME.primaryLight, color: THEME.primary, fontSize: '11px' }}
                    >
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    className="btn btn-link p-0 small text-decoration-none fw-semibold"
                    style={{ fontSize: '12px', color: THEME.primary }}
                    onClick={handleMarkAllRead}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification Items List */}
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted small">
                    <div style={{ fontSize: '1.8rem', opacity: 0.5, marginBottom: '6px' }}>🔕</div>
                    No recent notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      className="p-3 border-bottom position-relative"
                      style={{
                        backgroundColor: n.isRead ? THEME.cardBg : THEME.primaryLight,
                        borderColor: THEME.border,
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                      onClick={(e) => !n.isRead && handleMarkRead(n._id, e)}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-1 gap-2">
                        <span
                          className="fw-semibold text-truncate"
                          style={{ color: THEME.navy, fontSize: '13px', maxWidth: '85%' }}
                        >
                          {n.title}
                        </span>
                        {!n.isRead && (
                          <span
                            className="badge rounded-circle p-1"
                            style={{ backgroundColor: THEME.primary, width: 7, height: 7 }}
                          />
                        )}
                      </div>
                      <p
                        className="mb-1 text-secondary text-truncate-2"
                        style={{ fontSize: '12px', lineHeight: 1.35 }}
                      >
                        {n.message}
                      </p>
                      <small className="text-muted" style={{ fontSize: '10px' }}>
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                        {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </small>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Capsule */}
        <div
          className="d-flex align-items-center gap-2 p-1 pe-2.5 rounded-pill shadow-sm"
          style={{
            backgroundColor: THEME.surface,
            border: `1px solid ${THEME.border}`,
            cursor: 'pointer',
          }}
        >
          <div
            className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: THEME.primary,
              fontSize: '13px',
              flexShrink: 0,
            }}
          >
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>

          <div className="d-none d-sm-block text-truncate" style={{ maxWidth: '130px', lineHeight: 1.2 }}>
            <div
              className="fw-semibold text-truncate"
              style={{ color: THEME.navy, fontSize: '12px' }}
            >
              {user?.name || 'Administrator'}
            </div>
            <div
              className="text-secondary text-truncate"
              style={{ fontSize: '10px', textTransform: 'capitalize' }}
            >
              {user?.roleId?.name || 'Enterprise Staff'}
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes fadeDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .text-truncate-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default Navbar;