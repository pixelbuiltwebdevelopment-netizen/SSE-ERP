import React, { useState, useEffect } from 'react';
import { getCorrections, approveCorrection, rejectCorrection } from '../../../api/attendanceApi';
import Pagination from '../../../components/common/Pagination';

// ERP Design Tokens
const THEME = {
  navy: '#0F172A',
  primary: '#2563EB',
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

const AttendanceCorrectionsPage = () => {
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Review modal
  const [selectedReq, setSelectedReq] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' | 'reject'
  const [reviewNotes, setReviewNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchCorrections = async () => {
    setLoading(true);
    try {
      const res = await getCorrections({
        status: statusFilter || undefined,
        page,
        limit: 15,
      });
      if (res && res.success) {
        setCorrections(res.data.corrections || []);
        setPagination({
          page: res.data.pagination.page,
          totalPages: res.data.pagination.pages,
          total: res.data.pagination.total,
        });
      }
    } catch (err) {
      console.error('Error fetching corrections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCorrections();
  }, [statusFilter, page]);

  const handleOpenApprove = (req) => {
    setSelectedReq(req);
    setReviewNotes('Approved based on manager verification.');
    setActionType('approve');
  };

  const handleOpenReject = (req) => {
    setSelectedReq(req);
    setReviewNotes('');
    setActionType('reject');
  };

  const handleConfirmAction = async () => {
    if (!selectedReq) return;
    setProcessing(true);
    try {
      if (actionType === 'approve') {
        await approveCorrection(selectedReq._id, { reviewNotes });
      } else {
        if (!reviewNotes.trim()) {
          alert('Please enter review notes / reason for rejection.');
          setProcessing(false);
          return;
        }
        await rejectCorrection(selectedReq._id, { reviewNotes });
      }
      setSelectedReq(null);
      setActionType(null);
      fetchCorrections();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ backgroundColor: THEME.surface, minHeight: '100%' }}>
      {/* Top Header & Filters */}
      <div
        className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 pb-3 mb-3 border-bottom"
        style={{ borderColor: THEME.border }}
      >
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span style={{ fontSize: '1.2rem' }}>📝</span>
            <h4 className="fw-bold mb-0" style={{ color: THEME.navy, letterSpacing: '-0.02em' }}>
              Attendance Correction Requests
            </h4>
          </div>
          <p className="small text-secondary mb-0">
            Audit, verify, and resolve employee timing dispute claims and missed punch tickets.
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
            onClick={fetchCorrections}
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
            <div className="spinner-border spinner-border-sm text-primary me-2"></div>
            <span className="text-muted small">Loading correction requests...</span>
          </div>
        ) : corrections.length === 0 ? (
          <div className="text-center py-5 px-3">
            <div style={{ fontSize: '2.5rem', opacity: 0.4, marginBottom: '8px' }}>📂</div>
            <h6 className="fw-bold" style={{ color: THEME.navy }}>
              No Correction Requests Found
            </h6>
            <p className="text-muted small mb-0">
              There are currently no tickets matching the selected status filter.
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
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }}>Dispute Category</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }}>Requested Times</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }}>Justification</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }}>Status</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }}>Audited By</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }} className="text-end pe-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {corrections.map((r) => {
                    const statusBadge = getStatusBadge(r.status);
                    return (
                      <tr key={r._id} style={{ borderBottom: `1px solid ${THEME.border}` }}>
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
                                backgroundColor: '#EFF6FF',
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

                        {/* Correction Type */}
                        <td>
                          <span
                            className="badge bg-light text-dark border px-2 py-1"
                            style={{ fontSize: '11px', fontWeight: 600 }}
                          >
                            {r.correctionType?.replace(/_/g, ' ') || 'MISSED PUNCH'}
                          </span>
                        </td>

                        {/* Requested Timings */}
                        <td>
                          <div style={{ fontSize: '12px', lineHeight: 1.3 }}>
                            {r.requestedPunchIn && (
                              <div>
                                <span className="text-muted">In: </span>
                                <strong>{new Date(r.requestedPunchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                              </div>
                            )}
                            {r.requestedPunchOut && (
                              <div>
                                <span className="text-muted">Out: </span>
                                <strong>{new Date(r.requestedPunchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                              </div>
                            )}
                            {!r.requestedPunchIn && !r.requestedPunchOut && <span className="text-muted">-</span>}
                          </div>
                        </td>

                        {/* Justification Reason */}
                        <td>
                          <small
                            className="text-secondary text-truncate d-block"
                            style={{ maxWidth: '180px' }}
                            title={r.reason}
                          >
                            {r.reason || 'No justification provided'}
                          </small>
                        </td>

                        {/* Status Badge */}
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

                        {/* Reviewer & Notes */}
                        <td>
                          <div style={{ lineHeight: 1.2 }}>
                            <div className="fw-medium" style={{ fontSize: '12px', color: THEME.navy }}>
                              {r.reviewedBy?.name || '-'}
                            </div>
                            {r.reviewNotes && (
                              <small className="text-muted text-truncate d-block" style={{ maxWidth: '120px' }}>
                                {r.reviewNotes}
                              </small>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="text-end pe-3">
                          {r.status === 'Pending' ? (
                            <div className="d-flex justify-content-end gap-1.5">
                              <button
                                className="btn btn-sm btn-outline-success py-1 px-2.5 d-inline-flex align-items-center gap-1"
                                style={{ fontSize: '12px' }}
                                onClick={() => handleOpenApprove(r)}
                                title="Approve Ticket"
                              >
                                ✓ <span>Approve</span>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger py-1 px-2.5 d-inline-flex align-items-center gap-1"
                                style={{ fontSize: '12px' }}
                                onClick={() => handleOpenReject(r)}
                                title="Reject Ticket"
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
              {corrections.map((r) => {
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

                    <div className="mb-2">
                      <span className="badge bg-light text-dark border px-2 py-0.5" style={{ fontSize: '10px' }}>
                        {r.correctionType?.replace(/_/g, ' ') || 'MISSED PUNCH'}
                      </span>
                    </div>

                    {/* Timings */}
                    <div
                      className="p-2 rounded mb-2"
                      style={{ backgroundColor: THEME.surface, fontSize: '12px', border: `1px solid ${THEME.border}` }}
                    >
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Punch In:</span>
                        <strong>
                          {r.requestedPunchIn
                            ? new Date(r.requestedPunchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </strong>
                      </div>
                      <div className="d-flex justify-content-between mt-1">
                        <span className="text-muted">Punch Out:</span>
                        <strong>
                          {r.requestedPunchOut
                            ? new Date(r.requestedPunchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </strong>
                      </div>
                    </div>

                    <div className="small mb-3">
                      <span className="text-muted">Reason: </span>
                      <span style={{ color: THEME.navy }}>{r.reason}</span>
                    </div>

                    {/* Action Buttons */}
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
                          ✓ Approve
                        </button>
                      </div>
                    ) : (
                      <div className="text-muted small pt-1 border-top" style={{ borderColor: THEME.border }}>
                        Reviewed by: <b>{r.reviewedBy?.name || 'Administrator'}</b>
                        {r.reviewNotes && <div>Note: {r.reviewNotes}</div>}
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

      {/* Review Action Modal with Blurred Glass Backdrop */}
      {actionType && selectedReq && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 1060,
          }}
          onClick={() => setActionType(null)}
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
                  {actionType === 'approve' ? 'Approve Correction Request' : 'Reject Correction Request'}
                </h6>
                <small className="text-secondary">
                  Ticket #{selectedReq._id?.slice(-6)?.toUpperCase()}
                </small>
              </div>
              <button className="btn-close" onClick={() => setActionType(null)}></button>
            </div>

            <div className="mb-3">
              <div className="p-2.5 rounded-2 mb-3" style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.border}` }}>
                <div className="small">
                  <strong>Employee:</strong> {selectedReq.userId?.name} ({selectedReq.date})
                </div>
                <div className="small text-muted mt-1">
                  <strong>Requested Change:</strong> {selectedReq.correctionType?.replace(/_/g, ' ')}
                </div>
                <div className="small text-muted mt-1">
                  <strong>Employee Reason:</strong> <em>"{selectedReq.reason}"</em>
                </div>
              </div>

              <div>
                <label className="form-label small fw-semibold" style={{ color: THEME.navy }}>
                  Administrator Review Justification {actionType === 'reject' && <span className="text-danger">*</span>}
                </label>
                <textarea
                  className="form-control form-control-sm"
                  rows="3"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={actionType === 'approve' ? 'Optional verification comment...' : 'Enter mandatory rejection reason...'}
                  style={{ borderColor: THEME.border }}
                  required={actionType === 'reject'}
                ></textarea>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <button
                type="button"
                className="btn btn-sm btn-light border"
                onClick={() => setActionType(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn btn-sm text-white ${actionType === 'approve' ? 'btn-success' : 'btn-danger'}`}
                style={{
                  backgroundColor: actionType === 'approve' ? THEME.success : THEME.danger,
                  borderColor: actionType === 'approve' ? THEME.success : THEME.danger,
                }}
                onClick={handleConfirmAction}
                disabled={processing}
              >
                {processing ? 'Processing...' : actionType === 'approve' ? 'Confirm & Apply' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceCorrectionsPage;