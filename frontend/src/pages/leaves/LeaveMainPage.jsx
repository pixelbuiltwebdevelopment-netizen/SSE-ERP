import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { leaveApi } from '../../api/leaveApi';
import { usePermission } from '../../hooks/usePermission';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import { useSocket } from '../../components/providers/SocketProvider';
import { useAuth } from '../../hooks/useAuth';

// Official Enterprise Color Palette
const ERP = {
  electric: '#087FF5',  // Primary Brand Blue
  royal: '#0057B8',     // Deep Royal Accent
  hover: '#1D4ED8',     // Hover Blue
  silver: '#C5CED8',    // Silver Accent
  bg: '#F4F7FB',        // Ice White Background
  card: '#FFFFFF',      // Pure White Card
  slate: '#1E293B',     // Primary Slate Text
  gray: '#64748B',      // Secondary Gray Text
  border: '#E2E8F0',    // Light Border
  success: '#16A34A',   // Green
  successBg: '#DCFCE7', // Green Tint
  warning: '#D97706',   // Amber
  warningBg: '#FEF3C7', // Amber Tint
  error: '#DC2626',     // Red
  errorBg: '#FEE2E2',   // Red Tint
  primaryBg: '#EBF4FE', // Ice Blue Tint
  tableHead: '#F8FAFC', // Crisp Corporate Header Gray
};

// Inline SVGs
const Icons = {
  Calendar: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'block' }}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Clock: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'block' }}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  CheckCircle: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'block' }}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  XCircle: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'block' }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  Pdf: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'block' }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Plus: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'block' }}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  User: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'block' }}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Users: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'block' }}>
      <path d="M17 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M7 21v-2a4 4 0 0 1 3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <circle cx="9" cy="7" r="4" />
    </svg>
  ),
  Eye: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'block' }}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
};

const LeaveMainPage = () => {
  const { can } = usePermission();
  const socket = useSocket();
  const { user } = useAuth();

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const canRequest = Boolean(user) || can('leaves', 'create');
  const canApprove = can('leaves', 'approve');

  const [activeTab, setActiveTab] = useState('my');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('today');

  // Modals & Action States
  const [viewModal, setViewModal] = useState({ show: false, leave: null });
  const [rejectModal, setRejectModal] = useState({ show: false, leaveId: '', reason: '' });
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    setPage(1);
    setStatusFilter(activeTab === 'team' ? 'Pending' : '');
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [page, activeTab, statusFilter]);

  // Real-time listener
  useEffect(() => {
    if (!socket || !user) return;

    const handleLeaveUpdated = (updatedLeave) => {
      const leaveUserId = updatedLeave.userId?._id || updatedLeave.userId;
      if (activeTab === 'my' && leaveUserId !== user._id) return;

      setLeaves((prevLeaves) => {
        if (!statusFilter || updatedLeave.status === statusFilter) {
          const index = prevLeaves.findIndex((l) => l._id === updatedLeave._id);
          if (index > -1) {
            const next = [...prevLeaves];
            next[index] = updatedLeave;
            return next;
          }
          return [updatedLeave, ...prevLeaves];
        }
        return prevLeaves.filter((l) => l._id !== updatedLeave._id);
      });
    };

    socket.on('leave_updated', handleLeaveUpdated);
    return () => socket.off('leave_updated', handleLeaveUpdated);
  }, [socket, activeTab, statusFilter, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 100 };
      if (statusFilter && statusFilter.trim() !== '') {
        params.status = statusFilter;
      }

      const res =
        activeTab === 'my'
          ? await leaveApi.getMyLeaves(params)
          : await leaveApi.getLeaves(params);

      if (res.data?.success) {
        setLeaves(res.data.data.records || []);
        setPagination({
          page: res.data.data.pagination.page,
          totalPages: res.data.data.pagination.pages,
          total: res.data.data.pagination.total,
        });
      }
    } catch (err) {
      console.error('Failed to fetch leave records:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this leave request?')) return;
    setProcessingId(id);
    try {
      await leaveApi.approveLeave(id);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Approval action failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    setProcessingId(rejectModal.leaveId);
    try {
      await leaveApi.rejectLeave(rejectModal.leaveId, rejectModal.reason);
      setRejectModal({ show: false, leaveId: '', reason: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Rejection action failed');
    } finally {
      setProcessingId(null);
    }
  };

  // Filter computation
  const displayedLeaves = useMemo(() => {
    if (periodFilter === 'all') return leaves;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    const past7DaysStart = startOfToday - 7 * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    return leaves.filter((leave) => {
      const leaveStart = new Date(leave.startDate).getTime();
      const leaveEnd = new Date(leave.endDate || leave.startDate).getTime();
      const createdDate = leave.createdAt ? new Date(leave.createdAt).getTime() : leaveStart;

      if (periodFilter === 'today') {
        const isOnLeaveToday = leaveStart <= endOfToday && leaveEnd >= startOfToday;
        const isCreatedToday = createdDate >= startOfToday && createdDate <= endOfToday;
        return isOnLeaveToday || isCreatedToday;
      }

      if (periodFilter === 'week') {
        const touchesWeek = leaveEnd >= past7DaysStart && leaveStart <= endOfToday;
        const createdInWeek = createdDate >= past7DaysStart && createdDate <= endOfToday;
        return touchesWeek || createdInWeek;
      }

      if (periodFilter === 'month') {
        return leaveStart <= endOfMonth && leaveEnd >= startOfMonth;
      }

      return true;
    });
  }, [leaves, periodFilter]);

  const metrics = useMemo(() => {
    const total = leaves.length;
    const pending = leaves.filter((l) => l.status === 'Pending').length;
    const approved = leaves.filter((l) => l.status === 'Approved').length;
    const rejected = leaves.filter((l) => l.status === 'Rejected').length;
    return { total, pending, approved, rejected };
  }, [leaves]);

  const handleExportPDF = () => {
    if (displayedLeaves.length === 0) {
      alert('No records available to export.');
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Please allow popups to export the PDF file.');
      return;
    }

    const rows = displayedLeaves
      .map(
        (l, i) => `
        <tr>
          <td style="padding: 10px 12px; border: 1px solid #CBD5E1; text-align: center;">${i + 1}</td>
          <td style="padding: 10px 12px; border: 1px solid #CBD5E1; font-family: monospace; font-weight: bold; color: ${ERP.royal};">#${l._id.slice(-6).toUpperCase()}</td>
          <td style="padding: 10px 12px; border: 1px solid #CBD5E1; font-weight: 600;">${l.userId?.name || user?.name || 'Self'}</td>
          <td style="padding: 10px 12px; border: 1px solid #CBD5E1;">${l.leaveType}</td>
          <td style="padding: 10px 12px; border: 1px solid #CBD5E1;">${l.totalDays === 0.5 ? `Half Day (${l.halfDaySession || 'First Half'})` : `${l.totalDays} Day(s)`}</td>
          <td style="padding: 10px 12px; border: 1px solid #CBD5E1;">${new Date(l.startDate).toLocaleDateString()} to ${new Date(l.endDate || l.startDate).toLocaleDateString()}</td>
          <td style="padding: 10px 12px; border: 1px solid #CBD5E1; text-align: center;">
            <span style="display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: bold; background-color: ${
              l.status === 'Approved' ? ERP.successBg : l.status === 'Rejected' ? ERP.errorBg : ERP.warningBg
            }; color: ${l.status === 'Approved' ? ERP.success : l.status === 'Rejected' ? ERP.error : ERP.warning};">
              ${l.status}
            </span>
          </td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Leave_Audit_Report_${new Date().toISOString().slice(0, 10)}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; color: ${ERP.slate}; }
            .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid ${ERP.electric}; padding-bottom: 12px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: 800; color: ${ERP.slate}; margin: 0; }
            .meta { font-size: 12px; color: ${ERP.gray}; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background-color: ${ERP.tableHead}; color: ${ERP.slate}; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #CBD5E1; }
            @media print {
              @page { size: landscape; margin: 10mm; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">Enterprise Leave Audit Directory</div>
              <div class="meta">Filter: ${periodFilter.toUpperCase()} | Generated By: ${user?.name || 'Authorized User'} | Records: ${displayedLeaves.length}</div>
            </div>
            <div style="font-weight: 700; font-size: 12px; color: ${ERP.electric};">
              ERP WORKFORCE ATTENDANCE
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 4%; text-align: center;">#</th>
                <th style="width: 12%;">Reference</th>
                <th style="width: 22%;">Employee</th>
                <th style="width: 16%;">Leave Type</th>
                <th style="width: 14%;">Duration</th>
                <th style="width: 20%;">Date Range</th>
                <th style="width: 12%; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Approved':
        return { backgroundColor: ERP.successBg, color: ERP.success, border: '1px solid #86EFAC', borderLeftColor: ERP.success };
      case 'Rejected':
        return { backgroundColor: ERP.errorBg, color: ERP.error, border: '1px solid #FCA5A5', borderLeftColor: ERP.error };
      default:
        return { backgroundColor: ERP.warningBg, color: ERP.warning, border: '1px solid #FDE68A', borderLeftColor: ERP.warning };
    }
  };

  return (
    <>
      <style>{`
        .erp-card-elevated {
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
        }
        .erp-card-elevated:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06) !important;
        }
        .erp-btn-hover {
          transition: all 0.18s ease-in-out;
          -webkit-tap-highlight-color: transparent;
        }
        .erp-btn-hover:hover {
          transform: translateY(-1px);
          filter: brightness(1.04);
        }
        .erp-btn-hover:active {
          transform: scale(0.98);
        }
        .erp-table-row {
          transition: background-color 0.15s ease;
        }
        .erp-table-row:hover {
          background-color: #F8FAFC !important;
        }
        /* Mobile Scrollbar Cleaner */
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        /* Mobile Card Accent Line */
        .erp-mobile-card {
          border-left-width: 4px !important;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .erp-mobile-card:active {
          transform: scale(0.995);
        }
      `}</style>

      {/* Main Container - Optimized mobile padding */}
      <div 
        className="w-100 px-2 px-sm-3 px-md-4 px-xl-5 py-3 py-sm-4" 
        style={{ backgroundColor: ERP.bg, minHeight: '100vh', color: ERP.slate }}
      >
        <div className="mx-auto" style={{ maxWidth: '1360px' }}>
          
          {/* SECTION 1: TOP HEADER BANNER */}
          <div
            className="p-3 p-sm-4 rounded-3 rounded-sm-4 shadow-sm mb-3 mb-sm-4"
            style={{ backgroundColor: ERP.card, border: `1px solid ${ERP.border}` }}
          >
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
              <div>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <h4 className="fw-bold mb-0" style={{ color: ERP.slate, fontSize: 'clamp(1.15rem, 4vw, 1.35rem)', letterSpacing: '-0.3px' }}>
                    Leave & Attendance
                  </h4>
                  <span
                    className="badge rounded-pill fw-bold"
                    style={{ backgroundColor: ERP.primaryBg, color: ERP.electric, fontSize: '0.68rem', padding: '4px 8px' }}
                  >
                    {displayedLeaves.length}
                  </span>
                </div>
                <p className="small mb-0 text-muted" style={{ fontSize: '0.80rem' }}>
                  Manage daily leaves, workforce schedules, and review approvals.
                </p>
              </div>

              {/* Action Buttons: Stack horizontally with equal flex on mobile */}
              <div className="d-flex align-items-center gap-2 w-100 w-sm-auto mt-1 mt-sm-0">
                <button
                  type="button"
                  className="btn btn-sm d-inline-flex align-items-center justify-content-center fw-semibold rounded-3 flex-fill flex-sm-grow-0 erp-btn-hover"
                  style={{
                    backgroundColor: ERP.card,
                    border: `1px solid ${ERP.border}`,
                    color: ERP.slate,
                    fontSize: '0.82rem',
                    height: '40px',
                    padding: '0 14px',
                    gap: '6px',
                  }}
                  onClick={handleExportPDF}
                >
                  <Icons.Pdf />
                  <span>PDF</span>
                </button>

                {canRequest && (
                  <Link
                    to="/leaves/submit"
                    className="btn btn-sm d-inline-flex align-items-center justify-content-center fw-bold text-white text-decoration-none shadow-sm rounded-3 flex-fill flex-sm-grow-0 erp-btn-hover"
                    style={{
                      backgroundColor: ERP.electric,
                      border: 'none',
                      fontSize: '0.82rem',
                      height: '40px',
                      padding: '0 16px',
                      gap: '6px',
                    }}
                  >
                    <Icons.Plus />
                    <span>Apply Leave</span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: KPI METRIC STRIP (2x2 grid on mobile via col-6) */}
          <div className="row g-2 g-sm-3 g-xl-4 mb-3 mb-sm-4">
            {/* Total Requests */}
            <div className="col-6 col-lg-3">
              <div
                className="card border-0 shadow-sm rounded-3 rounded-sm-4 h-100 d-flex flex-row align-items-center p-2.5 p-sm-3 erp-card-elevated"
                style={{ backgroundColor: ERP.card, border: `1px solid ${ERP.border}`, gap: '10px' }}
              >
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: '38px', height: '38px', backgroundColor: ERP.primaryBg, color: ERP.electric }}
                >
                  <Icons.Calendar />
                </div>
                <div className="d-flex flex-column justify-content-center overflow-hidden">
                  <span className="fw-bold text-uppercase text-truncate" style={{ color: ERP.gray, fontSize: '0.64rem', letterSpacing: '0.4px' }}>
                    Total
                  </span>
                  <span className="fw-bold" style={{ color: ERP.slate, fontSize: '1.25rem', lineHeight: 1.1 }}>
                    {metrics.total}
                  </span>
                </div>
              </div>
            </div>

            {/* Pending Review */}
            <div className="col-6 col-lg-3">
              <div
                className="card border-0 shadow-sm rounded-3 rounded-sm-4 h-100 d-flex flex-row align-items-center p-2.5 p-sm-3 erp-card-elevated"
                style={{ backgroundColor: ERP.card, border: `1px solid ${ERP.border}`, gap: '10px' }}
              >
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: '38px', height: '38px', backgroundColor: ERP.warningBg, color: ERP.warning }}
                >
                  <Icons.Clock />
                </div>
                <div className="d-flex flex-column justify-content-center overflow-hidden">
                  <span className="fw-bold text-uppercase text-truncate" style={{ color: ERP.gray, fontSize: '0.64rem', letterSpacing: '0.4px' }}>
                    Pending
                  </span>
                  <span className="fw-bold" style={{ color: ERP.warning, fontSize: '1.25rem', lineHeight: 1.1 }}>
                    {metrics.pending}
                  </span>
                </div>
              </div>
            </div>

            {/* Approved */}
            <div className="col-6 col-lg-3">
              <div
                className="card border-0 shadow-sm rounded-3 rounded-sm-4 h-100 d-flex flex-row align-items-center p-2.5 p-sm-3 erp-card-elevated"
                style={{ backgroundColor: ERP.card, border: `1px solid ${ERP.border}`, gap: '10px' }}
              >
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: '38px', height: '38px', backgroundColor: ERP.successBg, color: ERP.success }}
                >
                  <Icons.CheckCircle />
                </div>
                <div className="d-flex flex-column justify-content-center overflow-hidden">
                  <span className="fw-bold text-uppercase text-truncate" style={{ color: ERP.gray, fontSize: '0.64rem', letterSpacing: '0.4px' }}>
                    Approved
                  </span>
                  <span className="fw-bold" style={{ color: ERP.success, fontSize: '1.25rem', lineHeight: 1.1 }}>
                    {metrics.approved}
                  </span>
                </div>
              </div>
            </div>

            {/* Rejected */}
            <div className="col-6 col-lg-3">
              <div
                className="card border-0 shadow-sm rounded-3 rounded-sm-4 h-100 d-flex flex-row align-items-center p-2.5 p-sm-3 erp-card-elevated"
                style={{ backgroundColor: ERP.card, border: `1px solid ${ERP.border}`, gap: '10px' }}
              >
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: '38px', height: '38px', backgroundColor: ERP.errorBg, color: ERP.error }}
                >
                  <Icons.XCircle />
                </div>
                <div className="d-flex flex-column justify-content-center overflow-hidden">
                  <span className="fw-bold text-uppercase text-truncate" style={{ color: ERP.gray, fontSize: '0.64rem', letterSpacing: '0.4px' }}>
                    Rejected
                  </span>
                  <span className="fw-bold" style={{ color: ERP.error, fontSize: '1.25rem', lineHeight: 1.1 }}>
                    {metrics.rejected}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: ROLE TABS SWITCHER (Full width 50/50 toggle on mobile) */}
          {canApprove && (
            <div 
              className="d-flex align-items-center gap-1.5 mb-3 p-1 rounded-3 shadow-sm w-100"
              style={{ 
                backgroundColor: ERP.card, 
                border: `1px solid ${ERP.border}`,
                maxWidth: '380px'
              }}
            >
              <button
                type="button"
                className="btn flex-fill fw-bold py-2 erp-btn-hover shadow-none d-inline-flex align-items-center justify-content-center gap-2"
                style={{
                  borderRadius: '6px',
                  backgroundColor: activeTab === 'my' ? ERP.electric : 'transparent',
                  color: activeTab === 'my' ? '#FFFFFF' : ERP.gray,
                  border: 'none',
                  fontSize: '0.82rem',
                }}
                onClick={() => setActiveTab('my')}
              >
                <Icons.User />
                <span>My Leaves</span>
              </button>

              <button
                type="button"
                className="btn flex-fill fw-bold py-2 erp-btn-hover shadow-none d-inline-flex align-items-center justify-content-center gap-2"
                style={{
                  borderRadius: '6px',
                  backgroundColor: activeTab === 'team' ? ERP.electric : 'transparent',
                  color: activeTab === 'team' ? '#FFFFFF' : ERP.gray,
                  border: 'none',
                  fontSize: '0.82rem',
                }}
                onClick={() => setActiveTab('team')}
              >
                <Icons.Users />
                <span>Team Approvals</span>
              </button>
            </div>
          )}

          {/* SECTION 4: PERIOD & STATUS FILTER BAR */}
          <div
            className="card border-0 shadow-sm rounded-3 rounded-sm-4 mb-3 mb-sm-4 p-2.5 p-sm-3"
            style={{ backgroundColor: ERP.card, border: `1px solid ${ERP.border}` }}
          >
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-stretch align-items-md-center gap-2.5">
              
              {/* Horizontal Scroll Chips for Periods */}
              <div className="d-flex align-items-center gap-1.5 overflow-x-auto hide-scrollbar py-1">
                {[
                  { id: 'today', label: 'Today' },
                  { id: 'week', label: 'Past 7 Days' },
                  { id: 'month', label: 'This Month' },
                  { id: 'all', label: 'All History' },
                ].map((period) => {
                  const isSelected = periodFilter === period.id;
                  return (
                    <button
                      key={period.id}
                      type="button"
                      className="btn btn-sm text-nowrap fw-bold rounded-pill erp-btn-hover flex-shrink-0"
                      style={{
                        backgroundColor: isSelected ? ERP.electric : '#F1F5F9',
                        color: isSelected ? '#FFFFFF' : ERP.gray,
                        border: 'none',
                        padding: '6px 14px',
                        fontSize: '0.76rem',
                      }}
                      onClick={() => setPeriodFilter(period.id)}
                    >
                      {period.label}
                    </button>
                  );
                })}
              </div>

              {activeTab === 'team' && (
                <div className="d-flex align-items-center gap-2 w-100 w-md-auto">
                  <select
                    className="form-select form-select-sm fw-semibold shadow-none w-100"
                    style={{
                      height: '38px',
                      borderColor: ERP.border,
                      color: ERP.slate,
                      fontSize: '0.78rem',
                      borderRadius: '8px',
                      padding: '6px 12px',
                    }}
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All Statuses</option>
                    <option value="Pending">Pending Approvals</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 5: DATA VIEW CONTAINER */}
          <div
            className="card border-0 shadow-sm rounded-3 rounded-sm-4 overflow-hidden mb-4"
            style={{ border: `1px solid ${ERP.border}` }}
          >
            {loading ? (
              <div className="py-5 text-center">
                <LoadingSpinner text="Retrieving leave records..." />
              </div>
            ) : displayedLeaves.length === 0 ? (
              <div className="text-center py-5 px-3" style={{ backgroundColor: ERP.card }}>
                <div 
                  className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                  style={{ width: '56px', height: '56px', backgroundColor: '#F1F5F9', color: ERP.gray }}
                >
                  <span style={{ fontSize: '1.5rem' }}>📅</span>
                </div>
                <h5 className="fw-bold mb-1" style={{ color: ERP.slate, fontSize: '1.05rem' }}>No Leave Records Found</h5>
                <p className="small mx-auto mb-3 text-muted" style={{ maxWidth: '380px', fontSize: '0.78rem' }}>
                  There are no leave requests registered for the selected filter period.
                </p>
                <button
                  type="button"
                  className="btn btn-sm fw-bold px-3 py-1.5 erp-btn-hover"
                  style={{ backgroundColor: ERP.primaryBg, color: ERP.electric, border: `1px solid ${ERP.electric}`, borderRadius: '6px' }}
                  onClick={() => setPeriodFilter('month')}
                >
                  Show This Month
                </button>
              </div>
            ) : (
              <>
                {/* Desktop Table View (>= 768px) */}
                <div className="table-responsive d-none d-md-block">
                  <table className="table align-middle mb-0 text-nowrap" style={{ fontSize: '0.82rem' }}>
                    <thead style={{ backgroundColor: ERP.tableHead, borderBottom: `2px solid ${ERP.border}` }}>
                      <tr className="text-uppercase" style={{ color: ERP.gray, fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                        <th className="py-3 px-3 px-md-4">REF ID</th>
                        {activeTab === 'team' && <th className="py-3 px-3">EMPLOYEE</th>}
                        <th className="py-3 px-3">LEAVE TYPE</th>
                        <th className="py-3 px-3">DATE RANGE</th>
                        <th className="py-3 px-3">DAYS</th>
                        <th className="py-3 px-3">STATUS</th>
                        <th className="py-3 px-3 px-md-4 text-end">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedLeaves.map((leave) => (
                        <tr key={leave._id} className="erp-table-row" style={{ borderBottom: `1px solid ${ERP.border}` }}>
                          <td className="py-3.5 px-3 px-md-4">
                            <span
                              className="badge font-monospace fw-semibold px-2 py-1"
                              style={{ backgroundColor: ERP.primaryBg, color: ERP.royal, border: `1px solid #BFDBFE`, borderRadius: '6px' }}
                            >
                              #{leave._id.slice(-6).toUpperCase()}
                            </span>
                          </td>

                          {activeTab === 'team' && (
                            <td className="py-3.5 px-3">
                              <div className="fw-bold text-truncate" style={{ maxWidth: '170px', color: ERP.slate }}>
                                {leave.userId?.name || 'Staff Member'}
                              </div>
                              <small className="text-truncate d-block text-muted" style={{ maxWidth: '170px', fontSize: '0.72rem' }}>
                                {leave.userId?.employeeId || leave.userId?.email}
                              </small>
                            </td>
                          )}

                          <td className="py-3.5 px-3">
                            <span
                              className="badge fw-semibold me-1 px-2.5 py-1"
                              style={{ backgroundColor: '#F1F5F9', color: ERP.slate, border: `1px solid ${ERP.border}`, borderRadius: '6px' }}
                            >
                              {leave.leaveType}
                            </span>
                            {leave.totalDays === 0.5 && (
                              <span
                                className="badge fw-semibold px-2 py-1"
                                style={{ backgroundColor: ERP.warningBg, color: ERP.warning, borderRadius: '6px' }}
                              >
                                Half Day ({leave.halfDaySession || '1st Half'})
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="fw-semibold" style={{ color: ERP.slate }}>
                              {new Date(leave.startDate).toLocaleDateString()}
                              {leave.startDate !== leave.endDate && ` to ${new Date(leave.endDate).toLocaleDateString()}`}
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <span className="fw-bold font-monospace" style={{ color: ERP.royal, fontSize: '0.88rem' }}>
                              {leave.totalDays}
                            </span>
                          </td>

                          <td className="py-3.5 px-3">
                            <span
                              className="badge rounded-pill fw-semibold px-3 py-1.5"
                              style={getStatusBadgeStyle(leave.status)}
                            >
                              ● {leave.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 px-md-4 text-end">
                            <div className="d-inline-flex align-items-center justify-content-end gap-1.5">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center justify-content-center fw-semibold rounded-2 erp-btn-hover"
                                style={{ height: '32px', padding: '0 10px', gap: '5px', fontSize: '0.76rem' }}
                                onClick={() => setViewModal({ show: true, leave })}
                              >
                                <Icons.Eye />
                                <span>View</span>
                              </button>

                              {activeTab === 'team' && leave.status === 'Pending' && (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-sm text-white fw-bold rounded-2 erp-btn-hover"
                                    style={{ backgroundColor: ERP.success, border: 'none', height: '32px', padding: '0 12px', fontSize: '0.76rem' }}
                                    onClick={() => handleApprove(leave._id)}
                                    disabled={processingId === leave._id}
                                  >
                                    Approve
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-sm text-white fw-bold rounded-2 erp-btn-hover"
                                    style={{ backgroundColor: ERP.error, border: 'none', height: '32px', padding: '0 12px', fontSize: '0.76rem' }}
                                    onClick={() => setRejectModal({ show: true, leaveId: leave._id, reason: '' })}
                                    disabled={processingId === leave._id}
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Touch-Friendly Card Deck (< 768px) */}
                <div className="d-block d-md-none p-2.5">
                  <div className="d-flex flex-column gap-2.5">
                    {displayedLeaves.map((leave) => {
                      const badgeStyle = getStatusBadgeStyle(leave.status);
                      return (
                        <div
                          key={leave._id}
                          className="p-3 rounded-3 border shadow-sm erp-mobile-card"
                          style={{ 
                            backgroundColor: ERP.card, 
                            borderColor: ERP.border,
                            borderLeftColor: badgeStyle.borderLeftColor || ERP.border 
                          }}
                        >
                          {/* Header: User / Leave Type & Status */}
                          <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                            <div className="overflow-hidden">
                              <span
                                className="badge font-monospace mb-1"
                                style={{ backgroundColor: ERP.primaryBg, color: ERP.royal, border: `1px solid #BFDBFE`, borderRadius: '4px', fontSize: '0.68rem' }}
                              >
                                #{leave._id.slice(-6).toUpperCase()}
                              </span>
                              <h6 className="fw-bold mb-0 text-truncate" style={{ color: ERP.slate, fontSize: '0.90rem' }}>
                                {activeTab === 'team' ? (leave.userId?.name || 'Staff Member') : leave.leaveType}
                              </h6>
                              {activeTab === 'team' && (
                                <span className="small text-muted d-block text-truncate" style={{ fontSize: '0.70rem' }}>
                                  {leave.userId?.employeeId || leave.leaveType}
                                </span>
                              )}
                            </div>

                            <span
                              className="badge rounded-pill fw-semibold px-2 py-1 flex-shrink-0"
                              style={{ ...badgeStyle, fontSize: '0.68rem' }}
                            >
                              ● {leave.status}
                            </span>
                          </div>

                          {/* Data Details Box */}
                          <div
                            className="p-2.5 rounded-2 mb-2.5"
                            style={{ backgroundColor: '#F8FAFC', border: `1px solid #EEF2F6`, fontSize: '0.76rem' }}
                          >
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <span className="text-muted">Dates:</span>
                              <span className="fw-semibold text-end" style={{ color: ERP.slate }}>
                                {new Date(leave.startDate).toLocaleDateString()}
                                {leave.startDate !== leave.endDate && ` → ${new Date(leave.endDate).toLocaleDateString()}`}
                              </span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="text-muted">Duration:</span>
                              <span className="font-monospace fw-bold" style={{ color: ERP.royal }}>
                                {leave.totalDays} Day{leave.totalDays > 1 ? 's' : ''} {leave.totalDays === 0.5 ? `(${leave.halfDaySession || 'Half'})` : ''}
                              </span>
                            </div>
                          </div>

                          {/* Actions: View Details & Optional Team Approvals */}
                          <div className="d-flex align-items-center gap-2 pt-1 border-top" style={{ borderColor: '#F1F5F9' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary flex-fill fw-semibold d-inline-flex align-items-center justify-content-center erp-btn-hover"
                              style={{ fontSize: '0.76rem', height: '36px', gap: '5px' }}
                              onClick={() => setViewModal({ show: true, leave })}
                            >
                              <Icons.Eye />
                              <span>Details</span>
                            </button>

                            {activeTab === 'team' && leave.status === 'Pending' && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-sm text-white flex-fill fw-bold erp-btn-hover"
                                  style={{ backgroundColor: ERP.success, border: 'none', fontSize: '0.76rem', height: '36px' }}
                                  onClick={() => handleApprove(leave._id)}
                                  disabled={processingId === leave._id}
                                >
                                  Approve
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-sm text-white flex-fill fw-bold erp-btn-hover"
                                  style={{ backgroundColor: ERP.error, border: 'none', fontSize: '0.76rem', height: '36px' }}
                                  onClick={() => setRejectModal({ show: true, leaveId: leave._id, reason: '' })}
                                  disabled={processingId === leave._id}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* SECTION 6: PAGINATION FOOTER */}
            {!loading && displayedLeaves.length > 0 && (
              <div
                className="d-flex flex-column flex-sm-row justify-content-between align-items-center p-3 border-top gap-2"
                style={{ backgroundColor: ERP.card, borderColor: ERP.border }}
              >
                <div className="small text-muted text-center text-sm-start" style={{ fontSize: '0.76rem' }}>
                  Showing <strong>{displayedLeaves.length}</strong> record(s)
                </div>
                <div className="d-flex justify-content-center w-100 w-sm-auto overflow-x-auto">
                  <Pagination pagination={pagination} onPageChange={setPage} />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* VIEW DETAILS MODAL */}
        {viewModal.leave && (
          <Modal
            show={viewModal.show}
            title={`Leave Request #${viewModal.leave._id.slice(-6).toUpperCase()}`}
            onClose={() => setViewModal({ show: false, leave: null })}
          >
            <div className="p-3 mb-3 rounded-3" style={{ backgroundColor: '#F8FAFC', border: `1px solid ${ERP.border}` }}>
              <div className="row g-2.5">
                {viewModal.leave.userId?.name && (
                  <div className="col-12 col-md-6">
                    <small className="d-block text-muted mb-0.5" style={{ fontSize: '0.70rem' }}>Employee</small>
                    <span className="fw-bold" style={{ color: ERP.slate, fontSize: '0.86rem' }}>{viewModal.leave.userId.name}</span>
                  </div>
                )}
                <div className="col-12 col-md-6">
                  <small className="d-block text-muted mb-0.5" style={{ fontSize: '0.70rem' }}>Status</small>
                  <span className="badge rounded-pill px-2.5 py-1" style={getStatusBadgeStyle(viewModal.leave.status)}>
                    {viewModal.leave.status}
                  </span>
                </div>
                <div className="col-6">
                  <small className="d-block text-muted mb-0.5" style={{ fontSize: '0.70rem' }}>Type</small>
                  <span className="fw-semibold" style={{ fontSize: '0.82rem' }}>{viewModal.leave.leaveType}</span>
                </div>
                <div className="col-6">
                  <small className="d-block text-muted mb-0.5" style={{ fontSize: '0.70rem' }}>Duration</small>
                  <span className="fw-bold font-monospace" style={{ color: ERP.royal, fontSize: '0.82rem' }}>
                    {viewModal.leave.totalDays} Day(s) {viewModal.leave.halfDaySession !== 'None' ? `(${viewModal.leave.halfDaySession})` : ''}
                  </span>
                </div>
                <div className="col-6">
                  <small className="d-block text-muted mb-0.5" style={{ fontSize: '0.70rem' }}>Start Date</small>
                  <span style={{ fontSize: '0.82rem' }}>{new Date(viewModal.leave.startDate).toLocaleDateString()}</span>
                </div>
                <div className="col-6">
                  <small className="d-block text-muted mb-0.5" style={{ fontSize: '0.70rem' }}>End Date</small>
                  <span style={{ fontSize: '0.82rem' }}>{new Date(viewModal.leave.endDate || viewModal.leave.startDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div
              className="p-3 rounded-3 mb-3"
              style={{ backgroundColor: ERP.bg, border: `1px solid ${ERP.border}` }}
            >
              <small className="d-block fw-semibold mb-1 text-muted" style={{ fontSize: '0.72rem' }}>Reason for Absence</small>
              <p className="mb-0 small" style={{ color: ERP.slate, fontSize: '0.80rem' }}>
                {viewModal.leave.reason || 'No detailed reason provided.'}
              </p>
            </div>

            <div className="d-flex justify-content-end pt-2 border-top">
              <button
                type="button"
                className="btn btn-light w-100 w-sm-auto px-4 py-2 fw-semibold erp-btn-hover"
                style={{ border: `1px solid ${ERP.silver}`, borderRadius: '6px', fontSize: '0.80rem' }}
                onClick={() => setViewModal({ show: false, leave: null })}
              >
                Close
              </button>
            </div>
          </Modal>
        )}

        {/* REJECTION REASON MODAL */}
        <Modal
          show={rejectModal.show}
          title="Reject Leave Application"
          onClose={() => setRejectModal({ show: false, leaveId: '', reason: '' })}
        >
          <form onSubmit={handleReject} className="p-1">
            <div className="mb-3">
              <label className="form-label small fw-bold text-muted mb-1" style={{ fontSize: '0.76rem' }}>
                Rejection Reason <span style={{ color: ERP.error }}>*</span>
              </label>
              <textarea
                className="form-control shadow-none"
                style={{
                  borderRadius: '6px',
                  borderColor: ERP.border,
                  fontSize: '0.82rem',
                  backgroundColor: ERP.card,
                  color: ERP.slate,
                  padding: '10px 12px',
                }}
                rows="3"
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                required
                placeholder="State the reason why this leave is being rejected..."
              />
            </div>
            <div className="d-flex justify-content-end gap-2 pt-2 border-top" style={{ borderColor: ERP.border }}>
              <button
                type="button"
                className="btn btn-light flex-fill flex-sm-grow-0 px-3 py-2 fw-semibold erp-btn-hover"
                style={{ border: `1px solid ${ERP.silver}`, borderRadius: '6px', fontSize: '0.80rem' }}
                onClick={() => setRejectModal({ show: false, leaveId: '', reason: '' })}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn text-white flex-fill flex-sm-grow-0 fw-bold px-3 py-2 erp-btn-hover"
                style={{ backgroundColor: ERP.error, border: 'none', borderRadius: '6px', fontSize: '0.80rem' }}
                disabled={processingId === rejectModal.leaveId}
              >
                Reject Leave
              </button>
            </div>
          </form>
        </Modal>

      </div>
    </>
  );
};

export default LeaveMainPage;