import React, { useState, useEffect } from 'react';
import {
  getAttendancePolicy,
  updateAttendancePolicy,
  getShifts,
  createShift,
  updateShift,
} from '../../../api/attendanceApi';

const AttendancePolicySettingsPage = () => {
  const [policy, setPolicy] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Shift Modal State
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    name: '',
    code: '',
    startTime: '09:00',
    endTime: '18:00',
    gracePeriodMinutes: 15,
    requiredHours: 8,
    breakMinutes: 60,
    unpaidBreakMinutes: 60,
    isNightShift: false,
    isDefault: false,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [policyRes, shiftsRes] = await Promise.all([
        getAttendancePolicy(),
        getShifts(),
      ]);
      if (policyRes.success) setPolicy(policyRes.data);
      if (shiftsRes.success) setShifts(shiftsRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load policy and shift settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePolicyChange = (field, value) => {
    setPolicy((prev) => ({ ...prev, [field]: value }));
  };

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    setSavingPolicy(true);
    setMessage('');
    setError('');
    try {
      const res = await updateAttendancePolicy(policy);
      if (res.success) {
        setMessage('Company attendance policies saved successfully.');
        setPolicy(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save attendance policy.');
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleCreateShift = async (e) => {
    e.preventDefault();
    try {
      const res = await createShift(shiftForm);
      if (res.success) {
        setMessage(`Shift '${shiftForm.name}' created successfully.`);
        setShowShiftModal(false);
        setShiftForm({
          name: '',
          code: '',
          startTime: '09:00',
          endTime: '18:00',
          gracePeriodMinutes: 15,
          requiredHours: 8,
          breakMinutes: 60,
          unpaidBreakMinutes: 60,
          isNightShift: false,
          isDefault: false,
        });
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create shift.');
    }
  };

  if (loading) {
    return (
      <div className="p-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2 text-muted small">Loading policy settings...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <div>
          <h5 className="fw-bold mb-1" style={{ color: '#071A33' }}>
            ⚙️ Company Attendance Policies & Work Schedules
          </h5>
          <p className="small text-muted mb-0">
            Define corporate shifts, late arrival grace limits, half-day thresholds, and automated missing punch-out rules.
          </p>
        </div>

        <button
          className="btn btn-sm btn-erp-primary d-inline-flex align-items-center gap-2"
          onClick={() => setShowShiftModal(true)}
        >
          <i className="bi bi-plus-circle"></i>
          <span>Add New Shift</span>
        </button>
      </div>

      {message && (
        <div className="alert alert-success d-flex align-items-center gap-2 small p-2 mb-3">
          <i className="bi bi-check-circle-fill"></i>
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 small p-2 mb-3">
          <i className="bi bi-exclamation-triangle-fill"></i>
          <span>{error}</span>
        </div>
      )}

      {/* Policy Configuration Form */}
      <form onSubmit={handleSavePolicy}>
        <div className="row g-4 mb-4">
          {/* Section 1: Timings & General Policy */}
          <div className="col-12 col-lg-6">
            <div className="erp-card bg-white p-3 p-md-4 h-100" style={{ border: '1px solid #E2E8F0' }}>
              <h6 className="fw-bold mb-3 pb-2 border-bottom" style={{ color: '#071A33' }}>
                🕒 Standard Schedule & Grace Limits
              </h6>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Company Operating Timezone</label>
                <select
                  className="form-select form-select-sm"
                  value={policy?.timezone || 'Asia/Kolkata'}
                  onChange={(e) => handlePolicyChange('timezone', e.target.value)}
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST - UTC+04:00)</option>
                  <option value="America/New_York">America/New_York (EST - UTC-05:00)</option>
                  <option value="Europe/London">Europe/London (BST - UTC+01:00)</option>
                  <option value="UTC">UTC (Universal Coordinated Time)</option>
                </select>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Standard Shift Start</label>
                  <input
                    type="time"
                    className="form-control form-control-sm"
                    value={policy?.standardStartTime || '09:00'}
                    onChange={(e) => handlePolicyChange('standardStartTime', e.target.value)}
                    required
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Standard Shift End</label>
                  <input
                    type="time"
                    className="form-control form-control-sm"
                    value={policy?.standardEndTime || '18:00'}
                    onChange={(e) => handlePolicyChange('standardEndTime', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Late Grace Period (Mins)</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={policy?.gracePeriodMinutes ?? 15}
                    onChange={(e) => handlePolicyChange('gracePeriodMinutes', parseInt(e.target.value, 10))}
                    min="0"
                    required
                  />
                  <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                    Punch-ins after this are marked Late.
                  </small>
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Early Departure Threshold (Mins)</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={policy?.earlyDepartureThresholdMinutes ?? 30}
                    onChange={(e) => handlePolicyChange('earlyDepartureThresholdMinutes', parseInt(e.target.value, 10))}
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="row g-2">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Unpaid Lunch/Break (Mins)</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={policy?.unpaidBreakMinutes ?? 60}
                    onChange={(e) => handlePolicyChange('unpaidBreakMinutes', parseInt(e.target.value, 10))}
                    min="0"
                    required
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Required Work Hours/Day</label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-control form-control-sm"
                    value={policy?.requiredWorkHours ?? 8.0}
                    onChange={(e) => handlePolicyChange('requiredWorkHours', parseFloat(e.target.value))}
                    min="1"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Automated Missing Punch-Out Rules & Thresholds */}
          <div className="col-12 col-lg-6">
            <div className="erp-card bg-white p-3 p-md-4 h-100" style={{ border: '1px solid #E2E8F0' }}>
              <h6 className="fw-bold mb-3 pb-2 border-bottom" style={{ color: '#071A33' }}>
                🤖 Missing Punch-Out & Overtime Automation
              </h6>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Automatic Punch-Out Mode</label>
                <select
                  className="form-select form-select-sm"
                  value={policy?.autoPunchOutMode || 'SHIFT_END'}
                  onChange={(e) => handlePolicyChange('autoPunchOutMode', e.target.value)}
                >
                  <option value="SHIFT_END">Mode A: Shift-Based Auto Punch-Out (Cap at scheduled shift end)</option>
                  <option value="MAX_HOURS">Mode B: Maximum Working-Hours Rule (Punch-in + max elapsed limit)</option>
                  <option value="DISABLED">Disabled (Keep session open until manual adjustment)</option>
                </select>
                <small className="text-muted d-block mt-1" style={{ fontSize: '0.72rem' }}>
                  {policy?.autoPunchOutMode === 'SHIFT_END'
                    ? 'Records missing punch-outs are effectively capped at shift end and flagged for manager review.'
                    : policy?.autoPunchOutMode === 'MAX_HOURS'
                    ? 'Records are auto closed after max hours without unverified overtime.'
                    : 'System will not automatically close missing punch-outs.'}
                </small>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Half-Day Threshold (Hrs)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-control form-control-sm"
                    value={policy?.halfDayThresholdHours ?? 4.0}
                    onChange={(e) => handlePolicyChange('halfDayThresholdHours', parseFloat(e.target.value))}
                    min="1"
                    required
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Full-Day Threshold (Hrs)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-control form-control-sm"
                    value={policy?.fullDayThresholdHours ?? 8.0}
                    onChange={(e) => handlePolicyChange('fullDayThresholdHours', parseFloat(e.target.value))}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="form-check form-switch mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="overtimeRequiresApproval"
                  checked={policy?.overtimeRequiresApproval ?? true}
                  onChange={(e) => handlePolicyChange('overtimeRequiresApproval', e.target.checked)}
                />
                <label className="form-check-label small fw-semibold" htmlFor="overtimeRequiresApproval">
                  Overtime Requires Administrative Approval
                </label>
              </div>

              <div className="form-check form-switch mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="autoPunchOutRequireReview"
                  checked={policy?.autoPunchOutRequireReview ?? true}
                  onChange={(e) => handlePolicyChange('autoPunchOutRequireReview', e.target.checked)}
                />
                <label className="form-check-label small fw-semibold" htmlFor="autoPunchOutRequireReview">
                  Flag Automatically Corrected Sessions for Manager Review
                </label>
              </div>

              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="autoPunchOutNotifyEmployee"
                  checked={policy?.autoPunchOutNotifyEmployee ?? true}
                  onChange={(e) => handlePolicyChange('autoPunchOutNotifyEmployee', e.target.checked)}
                />
                <label className="form-check-label small fw-semibold" htmlFor="autoPunchOutNotifyEmployee">
                  Notify Employee When Auto Punch-Out Is Triggered
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end mb-4">
          <button
            type="submit"
            className="btn btn-erp-primary px-4 py-2"
            disabled={savingPolicy}
          >
            {savingPolicy ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Saving Policies...
              </>
            ) : (
              'Save Company Policies'
            )}
          </button>
        </div>
      </form>

      {/* Available Company Shifts Table */}
      <div className="erp-card bg-white p-3 p-md-4" style={{ border: '1px solid #E2E8F0' }}>
        <h6 className="fw-bold mb-3 pb-2 border-bottom" style={{ color: '#071A33' }}>
          🏢 Configured Work Shifts
        </h6>

        <div className="table-responsive-container">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Shift Name</th>
                <th>Code</th>
                <th>Timings</th>
                <th>Grace Limit</th>
                <th>Required Hrs</th>
                <th>Break</th>
                <th>Type</th>
                <th>Default</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((s) => (
                <tr key={s._id}>
                  <td className="fw-semibold">{s.name}</td>
                  <td>
                    <span className="badge rounded-pill bg-light text-dark border">
                      {s.code}
                    </span>
                  </td>
                  <td>
                    {s.startTime} - {s.endTime}
                  </td>
                  <td>{s.gracePeriodMinutes || 15} mins</td>
                  <td>{s.requiredHours || 8} hrs</td>
                  <td>{s.breakMinutes || 60} mins</td>
                  <td>
                    <span className={`badge ${s.isNightShift ? 'bg-dark' : 'bg-info text-dark'}`}>
                      {s.isNightShift ? 'Night Shift' : 'Day Shift'}
                    </span>
                  </td>
                  <td>
                    {s.isDefault ? (
                      <span className="badge bg-success">Default</span>
                    ) : (
                      <span className="text-muted small">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Shift Modal */}
      {showShiftModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: 'rgba(7, 26, 51, 0.55)', zIndex: 1060 }}
          onClick={() => setShowShiftModal(false)}
        >
          <div
            className="erp-card bg-white p-4 shadow-lg rounded-3"
            style={{ width: '460px', maxWidth: '92vw' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <h5 className="fw-bold mb-0" style={{ color: '#071A33' }}>
                Create New Work Shift
              </h5>
              <button
                className="btn btn-sm btn-link text-secondary p-0 fs-5"
                onClick={() => setShowShiftModal(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleCreateShift}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Shift Name</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="e.g. Afternoon Production Shift"
                  value={shiftForm.name}
                  onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Shift Code</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="e.g. AFTN"
                  value={shiftForm.code}
                  onChange={(e) => setShiftForm({ ...shiftForm, code: e.target.value })}
                  required
                />
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Start Time</label>
                  <input
                    type="time"
                    className="form-control form-control-sm"
                    value={shiftForm.startTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">End Time</label>
                  <input
                    type="time"
                    className="form-control form-control-sm"
                    value={shiftForm.endTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Grace Period (Mins)</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={shiftForm.gracePeriodMinutes}
                    onChange={(e) => setShiftForm({ ...shiftForm, gracePeriodMinutes: parseInt(e.target.value, 10) })}
                    min="0"
                    required
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Required Work Hrs</label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-control form-control-sm"
                    value={shiftForm.requiredHours}
                    onChange={(e) => setShiftForm({ ...shiftForm, requiredHours: parseFloat(e.target.value) })}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="form-check mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="isNightShift"
                  checked={shiftForm.isNightShift}
                  onChange={(e) => setShiftForm({ ...shiftForm, isNightShift: e.target.checked })}
                />
                <label className="form-check-label small" htmlFor="isNightShift">
                  This is an overnight / night shift
                </label>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4">
                <button
                  type="button"
                  className="btn btn-sm btn-erp-outline"
                  onClick={() => setShowShiftModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-sm btn-erp-primary">
                  Create Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePolicySettingsPage;
