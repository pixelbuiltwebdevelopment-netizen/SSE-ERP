import React, { useState, useEffect } from 'react';
import { getMissingPunchOuts, runAutoPunchOutNow, correctAttendanceRecord } from '../../../api/attendanceApi';
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

const MissingPunchOutsPage = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningJob, setRunningJob] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Correction Modal State
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editPunchIn, setEditPunchIn] = useState('');
  const [editPunchOut, setEditPunchOut] = useState('');
  const [editStatus, setEditStatus] = useState('Present');
  const [editReason, setEditReason] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  const fetchQueue = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getMissingPunchOuts({ page, limit: 15 });
      if (res && res.success) {
        setRecords(res.data.records || []);
        setPagination({
          page: res.data.pagination.page,
          totalPages: res.data.pagination.pages,
          total: res.data.pagination.total,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch review queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [page]);

  const handleRunJob = async () => {
    setRunningJob(true);
    setMessage('');
    setError('');
    try {
      const res = await runAutoPunchOutNow();
      setMessage(res.message || 'Auto punch-out job executed successfully.');
      fetchQueue();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to execute auto punch-out job.');
    } finally {
      setRunningJob(false);
    }
  };

  const handleOpenEdit = (record) => {
    setSelectedRecord(record);
    setEditPunchIn(
      record.punchIn?.time
        ? new Date(record.punchIn.time).toISOString().slice(0, 16)
        : ''
    );
    setEditPunchOut(
      record.punchOut?.time
        ? new Date(record.punchOut.time).toISOString().slice(0, 16)
        : ''
    );
    setEditStatus(record.status || 'Present');
    setEditReason('');
  };

  const handleSaveCorrection = async (e) => {
    e.preventDefault();
    if (!editReason.trim()) {
      alert('Please provide an audit justification reason for manual correction.');
      return;
    }

    setSubmittingCorrection(true);
    try {
      const res = await correctAttendanceRecord(selectedRecord._id, {
        punchInTime: editPunchIn ? new Date(editPunchIn).toISOString() : undefined,
        punchOutTime: editPunchOut ? new Date(editPunchOut).toISOString() : undefined,
        status: editStatus,
        reason: editReason,
      });

      if (res.success) {
        setMessage('Attendance corrected and audit trail logged successfully.');
        setSelectedRecord(null);
        fetchQueue();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Correction failed.');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  return (
    <div style={{ backgroundColor: THEME.surface, minHeight: '100%' }}>
      {/* Top Header Section */}
      <div
        className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 pb-3 mb-3 border-bottom"
        style={{ borderColor: THEME.border }}
      >
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <h4 className="fw-bold mb-0" style={{ color: THEME.navy, letterSpacing: '-0.02em' }}>
              Missing Punch-Outs & Review Queue
            </h4>
          </div>
          <p className="small text-secondary mb-0">
            Audit unclosed shifts, verify system-capped attendance entries, and resolve discrepancies.
          </p>
        </div>

        <button
          className="btn btn-sm btn-primary d-inline-flex align-items-center gap-2 shadow-sm"
          style={{ backgroundColor: THEME.primary, borderColor: THEME.primary, height: '36px' }}
          onClick={handleRunJob}
          disabled={runningJob}
        >
          {runningJob ? (
            <span
              className="spinner-border spinner-border-sm"
              role="status"
              style={{ width: '14px', height: '14px', borderWidth: '2px' }}
            ></span>
          ) : (
            <span>⚡</span>
          )}
          <span>{runningJob ? 'Executing Job...' : 'Run Auto Punch-Out Now'}</span>
        </button>
      </div>

      {/* Notifications */}
      {message && (
        <div
          className="alert alert-success d-flex align-items-center justify-content-between small p-3 mb-3 rounded-3 shadow-sm"
          style={{ backgroundColor: THEME.successBg, color: THEME.success, border: '1px solid #A7F3D0' }}
        >
          <span>✓ {message}</span>
          <button className="btn-close btn-sm" onClick={() => setMessage('')}></button>
        </div>
      )}

      {error && (
        <div
          className="alert alert-danger d-flex align-items-center justify-content-between small p-3 mb-3 rounded-3 shadow-sm"
          style={{ backgroundColor: THEME.dangerBg, color: THEME.danger, border: '1px solid #FECACA' }}
        >
          <span>⚠️ {error}</span>
          <button className="btn-close btn-sm" onClick={() => setError('')}></button>
        </div>
      )}

      {/* Main Review Queue Card */}
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
            <span className="text-muted small">Loading review queue records...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-5 px-3">
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎉</div>
            <h6 className="fw-bold" style={{ color: THEME.navy }}>
              Review Queue Is Clear
            </h6>
            <p className="text-muted small mb-0">
              All employee shifts are properly closed and verified. No orphaned punches detected!
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
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }}>Shift / Dept</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }}>Punch In</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }}>Punch Out</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }}>Closing Method</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }}>Audit Flag / Reason</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }} className="text-end pe-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
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
                            {(r.userId?.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div style={{ lineHeight: 1.2 }}>
                            <div className="fw-semibold text-truncate" style={{ maxWidth: '140px', color: THEME.navy }}>
                              {r.userId?.name || 'Unknown'}
                            </div>
                            <small className="text-muted" style={{ fontSize: '11px' }}>
                              {r.userId?.employeeId || r.userId?.email || 'N/A'}
                            </small>
                          </div>
                        </div>
                      </td>

                      {/* Shift & Dept */}
                      <td>
                        <div style={{ lineHeight: 1.2 }}>
                          <span className="badge bg-light text-dark border px-2 py-0.5" style={{ fontSize: '10px' }}>
                            {r.shiftId?.code || 'GEN'}
                          </span>
                          <div className="text-muted text-truncate mt-1" style={{ fontSize: '11px', maxWidth: '120px' }}>
                            {r.departmentId?.name || 'General'}
                          </div>
                        </div>
                      </td>

                      {/* Punch In */}
                      <td className="text-nowrap">
                        {r.punchIn?.time ? (
                          <span className="fw-medium">
                            {new Date(r.punchIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>

                      {/* Punch Out */}
                      <td className="text-nowrap">
                        {r.punchOut?.time ? (
                          <span className="fw-medium">
                            {new Date(r.punchOut.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span
                            className="badge"
                            style={{ backgroundColor: THEME.dangerBg, color: THEME.danger, border: '1px solid #FECACA', fontSize: '11px' }}
                          >
                            Missing
                          </span>
                        )}
                      </td>

                      {/* Closing Method */}
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: r.isAutoPunchOut ? THEME.warningBg : THEME.dangerBg,
                            color: r.isAutoPunchOut ? THEME.warning : THEME.danger,
                            border: `1px solid ${r.isAutoPunchOut ? '#FDE68A' : '#FECACA'}`,
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          {r.punchOut?.method || (r.isAutoPunchOut ? 'Auto-ShiftEnd' : 'Unclosed Session')}
                        </span>
                      </td>

                      {/* Reason / Flag */}
                      <td>
                        <small
                          className="text-secondary text-truncate d-block"
                          style={{ maxWidth: '180px' }}
                          title={r.autoPunchOutReason || 'Employee missed check-out'}
                        >
                          {r.autoPunchOutReason || 'Employee missed check-out'}
                        </small>
                      </td>

                      {/* Actions */}
                      <td className="text-end pe-3">
                        <button
                          className="btn btn-sm btn-outline-primary py-1 px-2.5 d-inline-flex align-items-center gap-1"
                          style={{ fontSize: '12px' }}
                          onClick={() => handleOpenEdit(r)}
                          title="Correct Record"
                        >
                          ✏️ <span>Correct</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (Visible on < md) */}
            <div className="d-block d-md-none p-2">
              {records.map((r) => (
                <div
                  key={r._id}
                  className="p-3 mb-2 rounded-3"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: `1px solid ${THEME.border}`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <div className="fw-bold" style={{ color: THEME.navy }}>
                        {r.userId?.name || 'Unknown'}
                      </div>
                      <small className="text-muted">
                        {r.date} • {r.shiftId?.code || 'Shift'}
                      </small>
                    </div>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: r.isAutoPunchOut ? THEME.warningBg : THEME.dangerBg,
                        color: r.isAutoPunchOut ? THEME.warning : THEME.danger,
                        border: `1px solid ${r.isAutoPunchOut ? '#FDE68A' : '#FECACA'}`,
                        fontSize: '11px',
                      }}
                    >
                      {r.isAutoPunchOut ? 'Auto-ShiftEnd' : 'Unclosed'}
                    </span>
                  </div>

                  <div
                    className="p-2 rounded mb-2 d-flex justify-content-between"
                    style={{ backgroundColor: THEME.surface, fontSize: '12px', border: `1px solid ${THEME.border}` }}
                  >
                    <div>
                      <span className="text-muted d-block" style={{ fontSize: '10px' }}>PUNCH IN</span>
                      <strong>
                        {r.punchIn?.time
                          ? new Date(r.punchIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted d-block" style={{ fontSize: '10px' }}>PUNCH OUT</span>
                      <strong className={r.punchOut?.time ? 'text-dark' : 'text-danger'}>
                        {r.punchOut?.time
                          ? new Date(r.punchOut.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Missing'}
                      </strong>
                    </div>
                  </div>

                  <div className="small text-secondary mb-3">
                    Flag: <em>{r.autoPunchOutReason || 'Employee forgot to punch out'}</em>
                  </div>

                  <button
                    className="btn btn-sm btn-primary w-100 py-1.5"
                    style={{ backgroundColor: THEME.primary, borderColor: THEME.primary, fontSize: '12px' }}
                    onClick={() => handleOpenEdit(r)}
                  >
                    ✏️ Correct Record
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div
                className="d-flex justify-content-between align-items-center p-3 border-top flex-wrap gap-2"
                style={{ borderColor: THEME.border, backgroundColor: '#FAFAFA' }}
              >
                <span className="small text-muted">
                  Page <b>{pagination.page}</b> of <b>{pagination.totalPages}</b> ({pagination.total} records)
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

      {/* Admin Correction Modal with Blurred Glass Backdrop */}
      {selectedRecord && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 1060,
          }}
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="p-4 rounded-3 shadow-lg"
            style={{
              backgroundColor: '#FFFFFF',
              width: '100%',
              maxWidth: '460px',
              border: `1px solid ${THEME.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom" style={{ borderColor: THEME.border }}>
              <div>
                <h6 className="fw-bold mb-0" style={{ color: THEME.navy }}>
                  Manual Punch Adjustment
                </h6>
                <small className="text-secondary">
                  Employee: {selectedRecord.userId?.name} ({selectedRecord.date})
                </small>
              </div>
              <button className="btn-close" onClick={() => setSelectedRecord(null)}></button>
            </div>

            <form onSubmit={handleSaveCorrection}>
              <div className="mb-3">
                <label className="form-label small fw-semibold" style={{ color: THEME.navy }}>
                  Punch In Timestamp
                </label>
                <input
                  type="datetime-local"
                  className="form-control form-control-sm"
                  value={editPunchIn}
                  onChange={(e) => setEditPunchIn(e.target.value)}
                  style={{ borderColor: THEME.border }}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold" style={{ color: THEME.navy }}>
                  Effective Punch Out Timestamp
                </label>
                <input
                  type="datetime-local"
                  className="form-control form-control-sm"
                  value={editPunchOut}
                  onChange={(e) => setEditPunchOut(e.target.value)}
                  style={{ borderColor: THEME.border }}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold" style={{ color: THEME.navy }}>
                  Resolved Attendance Status
                </label>
                <select
                  className="form-select form-select-sm"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  style={{ borderColor: THEME.border }}
                >
                  <option value="Present">Present</option>
                  <option value="Half-Day">Half-Day</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-semibold" style={{ color: THEME.navy }}>
                  Audit Justification Reason <span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control form-control-sm"
                  rows="3"
                  placeholder="e.g., Biometric device offline; punch-out confirmed by manager."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  style={{ borderColor: THEME.border }}
                  required
                ></textarea>
                <small className="text-muted d-block mt-1" style={{ fontSize: '11px' }}>
                  This reason will be logged into the permanent system audit trail.
                </small>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-light border"
                  onClick={() => setSelectedRecord(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm btn-primary"
                  style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                  disabled={submittingCorrection}
                >
                  {submittingCorrection ? 'Applying...' : 'Apply Correction & Recalculate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissingPunchOutsPage;