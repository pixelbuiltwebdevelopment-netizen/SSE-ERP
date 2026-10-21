import React, { useState, useEffect } from 'react';
import { getOvertimeRequests, approveOvertime, rejectOvertime } from '../../../api/attendanceApi';
import Pagination from '../../../components/common/Pagination';

// ERP Design Tokens
const THEME = {
  navy: '#0F172A',
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  border: '#E2E8F0',
  surface: '#F8FAFC',
  cardBg: '#FFFFFF',
  textSecondary: '#64748B',
  success: '#059669',
  successBg: '#ECFDF5',
  warning: '#D97706',
  warningBg: '#FFFBEB',
  danger: '#DC2626',
  dangerBg: '#FEF2F2',
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'Approved':
      return { bg: THEME.successBg, color: THEME.success, border: '#A7F3D0' };
    case 'Rejected':
      return { bg: THEME.dangerBg, color: THEME.danger, border: '#FECACA' };
    case 'Pending':
    default:
      return { bg: THEME.warningBg, color: THEME.warning, border: '#FDE68A' };
  }
};

const OvertimeManagementPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Modal actions
  const [selectedReq, setSelectedReq] = useState(null);
  const [modalAction, setModalAction] = useState(null); // 'approve' | 'reject'
  const [approvedMinutes, setApprovedMinutes] = useState(60);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await getOvertimeRequests({
        status: statusFilter || undefined,
        page,
        limit: 15,
      });
      if (res && res.success) {
        setRequests(res.data.requests || []);
        setPagination({
          page: res.data.pagination.page,
          totalPages: res.data.pagination.pages,
          total: res.data.pagination.total,
        });
      }
    } catch (err) {
      console.error('Error fetching overtime requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, page]);

  const handleOpenApprove = (req) => {
    setSelectedReq(req);
    setApprovedMinutes(req.requestedMinutes || 60);
    setModalAction('approve');
  };

  const handleOpenReject = (req) => {
    setSelectedReq(req);
    setRejectionReason('');
    setModalAction('reject');
  };

  const handleConfirmAction = async () => {
    if (!selectedReq) return;
    setProcessing(true);
    try {
      if (modalAction === 'approve') {
        await approveOvertime(selectedReq._id, { approvedMinutes: parseInt(approvedMinutes, 10) });
      } else {
        if (!rejectionReason.trim()) {
          alert('Please enter a rejection reason.');
          setProcessing(false);
          return;
        }
        await rejectOvertime(selectedReq._id, { rejectionReason });
      }
      setSelectedReq(null);
      setModalAction(null);
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ backgroundColor: THEME.surface, minHeight: '100%' }}>
      {/* Header and Filter Controls */}
      <div
        className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 pb-3 mb-3 border-bottom"
        style={{ borderColor: THEME.border }}
      >
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span style={{ fontSize: '1.25rem' }}>⏱️</span>
            <h4 className="fw-bold mb-0" style={{ color: THEME.navy, letterSpacing: '-0.02em' }}>
              Overtime Verification & Sanction Hub
            </h4>
          </div>
          <p className="small text-secondary mb-0">
            Review extra hours clocked by workforce personnel, audit deliverable reasons, and authorize compensation.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <select
            className="form-select form-select-sm"
            style={{
              width: '160px',
              height: '35px',
              fontSize: '13px',
              borderColor: THEME.border,
              color: THEME.navy,
              fontWeight: 500,
            }}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending Review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>

          <button
            onClick={fetchRequests}
            title="Refresh List"
            className="btn btn-sm btn-light border d-flex align-items-center gap-1"
            style={{ height: '35px', borderColor: THEME.border }}
          >
            🔄
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div
        className="rounded-3 shadow-sm overflow-hidden"
        style={{
          backgroundColor: THEME.cardBg,
          border: `1px solid ${THEME.border}`,
        }}
      >
        {loading ? (
          <div className="text-center py-5">
            <div
              className="spinner-border spinner-border-sm text-primary me-2"
              role="status"
              style={{ width: '1.25rem', height: '1.25rem' }}
            ></div>
            <span className="text-muted small">Loading overtime records...</span>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-5 px-3">
            <div style={{ fontSize: '2.5rem', opacity: 0.4, marginBottom: '8px' }}>📂</div>
            <h6 className="fw-bold" style={{ color: THEME.navy }}>
              No Overtime Requests Found
            </h6>
            <p className="text-muted small mb-0">
              There are currently no overtime claims matching the selected filter.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (Visible on md+) */}
            <div className="table-responsive d-none d-md-block">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '13px' }}>
                <thead style={{ backgroundColor: THEME.surface, borderBottom: `2px solid ${THEME.border}` }}>
                  <tr>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600, padding: '12px 14px' }}>Date</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }}>Employee</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }}>Calculated OT</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }}>Requested OT</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }}>Approved OT</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }}>Deliverable / Reason</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }}>Status</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }}>Audited By</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }} className="text-end pe-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => {
                    const statusBadge = getStatusBadge(r.status);
                    return (
                      <tr key={r._id} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                        {/* Date */}
                        <td className="fw-semibold text-nowrap" style={{ padding: '12px 14px', color: THEME.navy }}>
                          {r.date}
                        </td>

                        {/* Employee Details */}
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: THEME.primaryLight,
                                color: THEME.primary,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '12px',
                                flexShrink: 0,
                              }}
                            >
                              {(r.userId?.name || 'E').charAt(0).toUpperCase()}
                            </div>
                            <div style={{ lineHeight: 1.2 }}>
                              <div className="fw-semibold text-truncate" style={{ maxWidth: '140px', color: THEME.navy }}>
                                {r.userId?.name || 'Employee'}
                              </div>
                              <small className="text-muted" style={{ fontSize: '11px' }}>
                                {r.userId?.employeeId || r.userId?.email || 'N/A'}
                              </small>
                            </div>
                          </div>
                        </td>

                        {/* Calculated OT */}
                        <td>
                          <span className="badge bg-light text-dark border px-2 py-1">
                            {r.calculatedOvertimeMinutes ? (r.calculatedOvertimeMinutes / 60).toFixed(1) : '0'} hrs
                          </span>
                        </td>

                        {/* Requested OT */}
                        <td>
                          <span className="fw-bold" style={{ color: THEME.primary }}>
                            {(r.requestedMinutes / 60).toFixed(1)} hrs
                          </span>
                        </td>

                        {/* Approved OT */}
                        <td>
                          {r.status === 'Approved' ? (
                            <span className="fw-bold text-success">
                              {(r.approvedMinutes / 60).toFixed(1)} hrs
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>

                        {/* Reason */}
                        <td>
                          <small
                            className="text-secondary text-truncate d-block"
                            style={{ maxWidth: '180px' }}
                            title={r.reason}
                          >
                            {r.reason || 'No deliverable details provided'}
                          </small>
                        </td>

                        {/* Status */}
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: statusBadge.bg,
                              color: statusBadge.color,
                              border: `1px solid ${statusBadge.border}`,
                              fontSize: '11px',
                              padding: '4px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            {r.status || 'Pending'}
                          </span>
                        </td>

                        {/* Reviewed By */}
                        <td>
                          <small className="text-secondary">
                            {r.approvedBy?.name || '-'}
                          </small>
                        </td>

                        {/* Action Buttons */}
                        <td className="text-end pe-3">
                          {r.status === 'Pending' ? (
                            <div className="d-flex justify-content-end gap-1.5">
                              <button
                                className="btn btn-sm btn-outline-success py-1 px-2.5 d-inline-flex align-items-center gap-1"
                                style={{ fontSize: '12px' }}
                                onClick={() => handleOpenApprove(r)}
                                title="Authorize Overtime"
                              >
                                ✓ <span>Authorize</span>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger py-1 px-2.5 d-inline-flex align-items-center gap-1"
                                style={{ fontSize: '12px' }}
                                onClick={() => handleOpenReject(r)}
                                title="Reject Overtime"
                              >
                                ✕ <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted small">Resolved</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (Visible on < md) */}
            <div className="d-block d-md-none p-2">
              {requests.map((r) => {
                const statusBadge = getStatusBadge(r.status);
                return (
                  <div
                    key={r._id}
                    className="p-3 mb-2 rounded-3"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: `1px solid ${THEME.border}`,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    {/* Header */}
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <div className="fw-bold" style={{ color: THEME.navy }}>
                          {r.userId?.name || 'Employee'}
                        </div>
                        <div className="text-muted small">{r.date}</div>
                      </div>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: statusBadge.bg,
                          color: statusBadge.color,
                          border: `1px solid ${statusBadge.border}`,
                          fontSize: '11px',
                          padding: '4px 8px',
                        }}
                      >
                        {r.status || 'Pending'}
                      </span>
                    </div>

                    {/* Metrics Grid */}
                    <div
                      className="p-2 rounded mb-2 d-flex justify-content-between text-center"
                      style={{ backgroundColor: THEME.surface, fontSize: '11px', border: `1px solid ${THEME.border}` }}
                    >
                      <div>
                        <span className="text-secondary d-block">CALCULATED</span>
                        <strong>{(r.calculatedOvertimeMinutes / 60).toFixed(1)}h</strong>
                      </div>
                      <div>
                        <span className="text-secondary d-block">CLAIMED</span>
                        <strong style={{ color: THEME.primary }}>{(r.requestedMinutes / 60).toFixed(1)}h</strong>
                      </div>
                      <div>
                        <span className="text-secondary d-block">SANCTIONED</span>
                        <strong className={r.status === 'Approved' ? 'text-success' : 'text-muted'}>
                          {r.status === 'Approved' ? `${(r.approvedMinutes / 60).toFixed(1)}h` : '-'}
                        </strong>
                      </div>
                    </div>

                    <div className="small text-secondary mb-3">
                      <strong>Deliverable: </strong>
                      <span>{r.reason || 'None provided'}</span>
                    </div>

                    {/* Actions */}
                    {r.status === 'Pending' ? (
                      <div className="d-flex gap-2 pt-1 border-top" style={{ borderColor: THEME.border }}>
                        <button
                          className="btn btn-sm btn-outline-danger flex-fill py-1.5"
                          style={{ fontSize: '12px' }}
                          onClick={() => handleOpenReject(r)}
                        >
                          ✕ Reject
                        </button>
                        <button
                          className="btn btn-sm btn-primary flex-fill py-1.5"
                          style={{ backgroundColor: THEME.success, borderColor: THEME.success, fontSize: '12px' }}
                          onClick={() => handleOpenApprove(r)}
                        >
                          ✓ Authorize
                        </button>
                      </div>
                    ) : (
                      <div className="text-muted small pt-1 border-top" style={{ borderColor: THEME.border }}>
                        Audited by: <b>{r.approvedBy?.name || 'Administrator'}</b>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div
                className="d-flex justify-content-between align-items-center p-3 border-top flex-wrap gap-2"
                style={{ borderColor: THEME.border, backgroundColor: '#FAFAFA' }}
              >
                <span className="small text-muted">
                  Page <b>{pagination.page}</b> of <b>{pagination.totalPages}</b> ({pagination.total} requests)
                </span>
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Dialog with Blurred Glass Backdrop */}
      {modalAction && selectedReq && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 1060,
          }}
          onClick={() => setModalAction(null)}
        >
          <div
            className="p-4 rounded-3 shadow-lg"
            style={{
              backgroundColor: '#FFFFFF',
              width: '100%',
              maxWidth: '440px',
              border: `1px solid ${THEME.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom" style={{ borderColor: THEME.border }}>
              <div>
                <h6 className="fw-bold mb-0" style={{ color: THEME.navy }}>
                  {modalAction === 'approve' ? 'Authorize Overtime Claim' : 'Reject Overtime Claim'}
                </h6>
                <small className="text-secondary">
                  Employee: {selectedReq.userId?.name} ({selectedReq.date})
                </small>
              </div>
              <button className="btn-close" onClick={() => setModalAction(null)}></button>
            </div>

            <div className="mb-3">
              <div className="p-2.5 rounded-2 mb-3" style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.border}` }}>
                <div className="small">
                  <strong>Requested Duration:</strong> {(selectedReq.requestedMinutes / 60).toFixed(1)} hrs ({selectedReq.requestedMinutes} mins)
                </div>
                <div className="small text-muted mt-1">
                  <strong>Task Details:</strong> <em>"{selectedReq.reason || 'No description provided'}"</em>
                </div>
              </div>

              {modalAction === 'approve' ? (
                <div>
                  <label className="form-label small fw-semibold" style={{ color: THEME.navy }}>
                    Authorized Payable Minutes
                  </label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={approvedMinutes}
                    onChange={(e) => setApprovedMinutes(e.target.value)}
                    min="1"
                    style={{ borderColor: THEME.border }}
                    required
                  />
                  <small className="text-muted mt-1 d-block" style={{ fontSize: '11px' }}>
                    Calculates to: <b>{(approvedMinutes / 60).toFixed(1)}</b> payable overtime hours.
                  </small>
                </div>
              ) : (
                <div>
                  <label className="form-label small fw-semibold" style={{ color: THEME.navy }}>
                    Rejection Reason <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control form-control-sm"
                    rows="3"
                    placeholder="Provide justification for rejecting this overtime claim..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    style={{ borderColor: THEME.border }}
                    required
                  ></textarea>
                </div>
              )}
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <button
                type="button"
                className="btn btn-sm btn-light border"
                onClick={() => setModalAction(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn btn-sm text-white ${modalAction === 'approve' ? 'btn-success' : 'btn-danger'}`}
                style={{
                  backgroundColor: modalAction === 'approve' ? THEME.success : THEME.danger,
                  borderColor: modalAction === 'approve' ? THEME.success : THEME.danger,
                }}
                onClick={handleConfirmAction}
                disabled={processing}
              >
                {processing ? 'Processing...' : modalAction === 'approve' ? 'Confirm Authorization' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OvertimeManagementPage;