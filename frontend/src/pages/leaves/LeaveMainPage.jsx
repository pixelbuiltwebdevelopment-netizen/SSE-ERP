import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  User,
  Users,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { leaveApi } from '../../api/leaveApi';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../components/providers/SocketProvider';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/Skeleton';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';

const LeaveMainPage = () => {
  const { can } = usePermission();
  const socket = useSocket();
  const { user } = useAuth();

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const canApprove = can('leaves', 'approve');

  const [activeTab, setActiveTab] = useState('my');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  // Modals & Action States
  const [rejectModal, setRejectModal] = useState({ show: false, leaveId: '', reason: '' });
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    setPage(1);
    setStatusFilter(activeTab === 'team' ? 'Pending' : '');
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;

      const res =
        activeTab === 'my'
          ? await leaveApi.getMyLeaves(params)
          : await leaveApi.getLeaves(params);

      if (res.data?.success) {
        setLeaves(res.data.data.records || []);
        setPagination({
          page: res.data.data.pagination.page || 1,
          totalPages: res.data.data.pagination.pages || 1,
          total: res.data.data.pagination.total || 0,
        });
      }
    } catch (err) {
      console.error('Failed to fetch leave records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, activeTab, statusFilter]);

  // Real-time socket listener
  useEffect(() => {
    if (!socket || !user) return;

    const handleLeaveUpdated = (updatedLeave) => {
      const leaveUserId = updatedLeave.userId?._id || updatedLeave.userId;
      if (activeTab === 'my' && leaveUserId !== user._id) return;
      fetchData();
    };

    socket.on('leave_updated', handleLeaveUpdated);
    return () => socket.off('leave_updated', handleLeaveUpdated);
  }, [socket, activeTab, user]);

  const metrics = useMemo(() => {
    const total = leaves.length;
    const pending = leaves.filter((l) => l.status === 'Pending').length;
    const approved = leaves.filter((l) => l.status === 'Approved').length;
    const rejected = leaves.filter((l) => l.status === 'Rejected').length;
    return { total, pending, approved, rejected };
  }, [leaves]);

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
    if (!rejectModal.reason.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }
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

  return (
    <div className="erp-fade-in pb-4">
      {/* ── Page Header ── */}
      <PageHeader
        title="Leave Management & Sanctions"
        subtitle="Manage employee time off applications, casual/sick leave allowances, and manager approval queues"
        breadcrumbs={[{ label: 'Operations' }, { label: 'Leaves' }]}
        actions={
          <Link to="/leaves/submit" className="erp-btn erp-btn-primary">
            <Plus size={16} /> Apply for Leave
          </Link>
        }
      />

      {/* ── KPI Row ── */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Total Applications"
            value={metrics.total}
            subtitle="Scoped leave records"
            icon={CalendarDays}
            variant="primary"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Pending Sanction"
            value={metrics.pending}
            subtitle="Awaiting management review"
            icon={Clock}
            variant="warning"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Sanctioned / Approved"
            value={metrics.approved}
            subtitle="Granted time off"
            icon={CheckCircle2}
            variant="success"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Declined / Rejected"
            value={metrics.rejected}
            subtitle="Disapproved requests"
            icon={XCircle}
            variant="danger"
          />
        </div>
      </div>

      {/* ── Segmented Tabs ── */}
      <div className="erp-tabs-nav mb-3">
        <button
          type="button"
          className={`erp-tab-btn ${activeTab === 'my' ? 'active' : ''}`}
          onClick={() => setActiveTab('my')}
        >
          <User size={16} />
          <span>My Leave Requests</span>
        </button>

        {canApprove && (
          <button
            type="button"
            className={`erp-tab-btn ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => setActiveTab('team')}
          >
            <Users size={16} />
            <span>Team Sanctions Queue</span>
          </button>
        )}
      </div>

      {/* ── Filter Bar ── */}
      <div className="erp-card p-3 mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-4">
            <select
              className="erp-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Leave Statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div className="col-12 col-md-8 text-md-end text-muted small">
            <span>Showing {leaves.length} of {pagination.total || leaves.length} applications</span>
          </div>
        </div>
      </div>

      {/* ── Leave Table ── */}
      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : leaves.length === 0 ? (
        <div className="erp-card p-4">
          <EmptyState
            icon={CalendarDays}
            title={activeTab === 'my' ? 'No personal leave applications' : 'No pending team requests'}
            description={
              activeTab === 'my'
                ? 'You have not submitted any leave requests.'
                : 'All employee leave requests in your department have been reviewed.'
            }
            actionLabel={activeTab === 'my' ? 'Apply for Leave' : undefined}
            onAction={activeTab === 'my' ? () => {} : undefined}
          />
        </div>
      ) : (
        <div className="erp-table-container">
          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  {activeTab === 'team' && <th>Employee</th>}
                  <th>Leave Type</th>
                  <th>Duration & Dates</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  {activeTab === 'team' && <th className="text-end">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l._id}>
                    {activeTab === 'team' && (
                      <td>
                        <div className="fw-semibold" style={{ color: 'var(--erp-text-main)' }}>
                          {l.userId?.name || 'Staff Member'}
                        </div>
                        <small className="text-muted d-block">{l.userId?.email || '—'}</small>
                      </td>
                    )}

                    <td>
                      <span className="erp-badge erp-badge-purple" style={{ fontSize: '0.72rem' }}>
                        {l.leaveType || 'Casual Leave'}
                      </span>
                    </td>

                    <td>
                      <div className="small fw-medium">
                        {new Date(l.startDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' → '}
                        {new Date(l.endDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>

                    <td>
                      <span className="fw-bold font-monospace small">
                        {l.numberOfDays || 1} day(s)
                      </span>
                    </td>

                    <td>
                      <div className="small text-truncate" style={{ maxWidth: '260px' }}>
                        {l.reason || 'Personal leave'}
                      </div>
                    </td>

                    <td>
                      <StatusBadge status={l.status || 'Pending'} size="sm" />
                    </td>

                    {activeTab === 'team' && (
                      <td className="text-end">
                        {l.status === 'Pending' ? (
                          <div className="d-inline-flex align-items-center gap-1">
                            <button
                              type="button"
                              className="erp-btn erp-btn-success erp-btn-sm p-1.5"
                              onClick={() => handleApprove(l._id)}
                              disabled={processingId === l._id}
                              title="Approve Leave"
                            >
                              <Check size={14} /> Approve
                            </button>
                            <button
                              type="button"
                              className="erp-btn erp-btn-danger-outline erp-btn-sm p-1.5"
                              onClick={() => setRejectModal({ show: true, leaveId: l._id, reason: '' })}
                              disabled={processingId === l._id}
                              title="Reject Leave"
                            >
                              <X size={14} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted small">Sanctioned</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-top">
            <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
          </div>
        </div>
      )}

      {/* ── Reject Reason Modal ── */}
      {rejectModal.show && (
        <Modal
          show={rejectModal.show}
          title="Reject Leave Request"
          onClose={() => setRejectModal({ show: false, leaveId: '', reason: '' })}
          size="md"
          icon={XCircle}
        >
          <form onSubmit={handleReject}>
            <div className="mb-3">
              <label className="erp-label">Rejection Reason *</label>
              <textarea
                className="erp-textarea"
                rows={3}
                placeholder="State the reason for rejecting this leave request..."
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                required
              />
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
              <button
                type="button"
                className="erp-btn erp-btn-secondary"
                onClick={() => setRejectModal({ show: false, leaveId: '', reason: '' })}
              >
                Cancel
              </button>
              <button type="submit" className="erp-btn erp-btn-danger">
                Confirm Rejection
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default LeaveMainPage;
