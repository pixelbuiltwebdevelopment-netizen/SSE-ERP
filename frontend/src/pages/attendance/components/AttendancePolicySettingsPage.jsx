import React, { useState, useEffect } from 'react';
import {
  Clock,
  Settings,
  ShieldCheck,
  Play,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
} from 'lucide-react';
import {
  getAttendancePolicy,
  updateAttendancePolicy,
  runAutoPunchOutNow,
} from '../../../api/attendanceApi';

const AttendancePolicySettingsPage = () => {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [runningAutoPunch, setRunningAutoPunch] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const policyRes = await getAttendancePolicy();
      if (policyRes.success) {
        setPolicy(policyRes.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load policy settings.');
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
        setMessage('Company-wide attendance policy saved successfully.');
        setPolicy(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save attendance policy.');
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleRunAutoPunch = async () => {
    setRunningAutoPunch(true);
    setMessage('');
    setError('');
    try {
      const res = await runAutoPunchOutNow();
      if (res.success) {
        setMessage(res.message || 'Automatic punch-out executed successfully.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to execute automatic punch-out.');
    } finally {
      setRunningAutoPunch(false);
    }
  };

  if (loading) {
    return (
      <div className="p-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2 text-muted small">Loading company policy settings...</p>
      </div>
    );
  }

  return (
    <div className="erp-fade-in">
      {/* ── Top Header ── */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <div>
          <h5 className="fw-bold mb-1" style={{ color: 'var(--erp-text-main, #0f172a)' }}>
            Company Attendance Policy & Standard Shift
          </h5>
          <p className="small text-muted mb-0">
            Configure the single organization-wide shift schedule, grace periods, day thresholds, and automated missing punch-out rules.
          </p>
        </div>

        <button
          type="button"
          className="erp-btn erp-btn-secondary erp-btn-sm d-inline-flex align-items-center gap-2"
          onClick={handleRunAutoPunch}
          disabled={runningAutoPunch}
          title="Manually trigger automatic checkout for open sessions"
        >
          {runningAutoPunch ? (
            <span className="spinner-border spinner-border-sm" role="status"></span>
          ) : (
            <Play size={14} className="text-primary" />
          )}
          <span>{runningAutoPunch ? 'Processing...' : 'Run Auto Punch-Out Now'}</span>
        </button>
      </div>

      {message && (
        <div className="alert alert-success d-flex align-items-center gap-2 small p-2 mb-3">
          <CheckCircle2 size={16} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 small p-2 mb-3">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Configuration Form ── */}
      <form onSubmit={handleSavePolicy}>
        <div className="row g-4 mb-4">
          {/* ── Section 1: Standard Company Shift & Grace Limits ── */}
          <div className="col-12 col-lg-6">
            <div className="erp-card bg-white p-3 p-md-4 h-100" style={{ border: '1px solid var(--erp-border, #e2e8f0)' }}>
              <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                <div
                  className="rounded-2 p-1.5 d-flex align-items-center justify-content-center"
                  style={{ backgroundColor: 'var(--erp-primary-light, #f0f9ff)', color: 'var(--erp-primary, #0284c7)' }}
                >
                  <Clock size={16} />
                </div>
                <div>
                  <h6 className="fw-bold mb-0" style={{ color: 'var(--erp-text-main, #0f172a)' }}>
                    Standard Company Shift & Grace Limits
                  </h6>
                  <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                    Single shift applied to all employees across the organization
                  </small>
                </div>
              </div>

              {/* Timezone */}
              <div className="mb-3">
                <label className="erp-label fw-semibold">Company Operating Timezone</label>
                <select
                  className="erp-select form-select-sm"
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

              {/* Shift Start & End */}
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="erp-label fw-semibold">Standard Shift Start *</label>
                  <input
                    type="time"
                    className="erp-input form-control-sm"
                    value={policy?.standardStartTime || '09:00'}
                    onChange={(e) => handlePolicyChange('standardStartTime', e.target.value)}
                    required
                  />
                </div>
                <div className="col-6">
                  <label className="erp-label fw-semibold">Standard Shift End *</label>
                  <input
                    type="time"
                    className="erp-input form-control-sm"
                    value={policy?.standardEndTime || '18:00'}
                    onChange={(e) => handlePolicyChange('standardEndTime', e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Grace Period & Early Departure */}
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="erp-label fw-semibold">Late Grace Period (Minutes) *</label>
                  <input
                    type="number"
                    className="erp-input form-control-sm"
                    value={policy?.gracePeriodMinutes ?? 15}
                    onChange={(e) => handlePolicyChange('gracePeriodMinutes', parseInt(e.target.value, 10))}
                    min="0"
                    required
                  />
                  <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                    Punch-ins after this are flagged Late.
                  </small>
                </div>
                <div className="col-6">
                  <label className="erp-label fw-semibold">Early Departure Threshold (Minutes) *</label>
                  <input
                    type="number"
                    className="erp-input form-control-sm"
                    value={policy?.earlyDepartureThresholdMinutes ?? 30}
                    onChange={(e) => handlePolicyChange('earlyDepartureThresholdMinutes', parseInt(e.target.value, 10))}
                    min="0"
                    required
                  />
                  <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                    Checkout before shift end triggers early alert.
                  </small>
                </div>
              </div>

              {/* Required Hours & Thresholds */}
              <div className="row g-2 mb-3">
                <div className="col-12">
                  <label className="erp-label fw-semibold">Required Work Hours/Day *</label>
                  <input
                    type="number"
                    step="0.5"
                    className="erp-input form-control-sm"
                    value={policy?.requiredWorkHours ?? 8.0}
                    onChange={(e) => handlePolicyChange('requiredWorkHours', parseFloat(e.target.value))}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="row g-2">
                <div className="col-6">
                  <label className="erp-label fw-semibold">Half-Day Threshold (Hours) *</label>
                  <input
                    type="number"
                    step="0.5"
                    className="erp-input form-control-sm"
                    value={policy?.halfDayThresholdHours ?? 4.0}
                    onChange={(e) => handlePolicyChange('halfDayThresholdHours', parseFloat(e.target.value))}
                    min="1"
                    required
                  />
                </div>
                <div className="col-6">
                  <label className="erp-label fw-semibold">Full-Day Threshold (Hours) *</label>
                  <input
                    type="number"
                    step="0.5"
                    className="erp-input form-control-sm"
                    value={policy?.fullDayThresholdHours ?? 8.0}
                    onChange={(e) => handlePolicyChange('fullDayThresholdHours', parseFloat(e.target.value))}
                    min="1"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 2: Missing Punch-Out Settings ── */}
          <div className="col-12 col-lg-6">
            <div className="erp-card bg-white p-3 p-md-4 h-100" style={{ border: '1px solid var(--erp-border, #e2e8f0)' }}>
              <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                <div
                  className="rounded-2 p-1.5 d-flex align-items-center justify-content-center"
                  style={{ backgroundColor: 'var(--erp-primary-light, #f0f9ff)', color: 'var(--erp-primary, #0284c7)' }}
                >
                  <Settings size={16} />
                </div>
                <div>
                  <h6 className="fw-bold mb-0" style={{ color: 'var(--erp-text-main, #0f172a)' }}>
                    Missing Punch-Out Settings
                  </h6>
                  <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                    Automatic checkout configuration for employees who forget to punch out
                  </small>
                </div>
              </div>

              {/* 1. Automatic Punch-Out Enable/Disable */}
              <div className="form-check form-switch mb-3 p-2.5 rounded-2 bg-light border">
                <input
                  className="form-check-input ms-0 me-2"
                  type="checkbox"
                  id="autoPunchOutEnabled"
                  checked={policy?.autoPunchOutEnabled ?? true}
                  onChange={(e) => handlePolicyChange('autoPunchOutEnabled', e.target.checked)}
                />
                <label className="form-check-label small fw-bold" htmlFor="autoPunchOutEnabled">
                  Enable Automatic Punch-Out Automation
                </label>
                <div className="text-muted mt-1" style={{ fontSize: '0.72rem' }}>
                  When enabled, open sessions are automatically calculated after 12:00 AM (midnight) using the configured checkout time.
                </div>
              </div>

              {/* 2. Automatic Punch-Out Time */}
              <div className="mb-3">
                <label className="erp-label fw-semibold">
                  Automatic Punch-Out Time *
                </label>
                <input
                  type="time"
                  className="erp-input form-control-sm"
                  value={policy?.autoPunchOutTime || policy?.standardEndTime || '18:00'}
                  onChange={(e) => handlePolicyChange('autoPunchOutTime', e.target.value)}
                  disabled={!(policy?.autoPunchOutEnabled ?? true)}
                  required
                />
                <small className="text-muted d-block mt-1" style={{ fontSize: '0.72rem' }}>
                  This official checkout time is recorded after 12:00 AM (midnight) for employees who forget to punch out that day (e.g. 06:00 PM or 08:00 PM). Working hours are calculated using actual punch-in and this checkout time.
                </small>
              </div>

              {/* 3. Manager Review Option */}
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="autoPunchOutRequireReview"
                  checked={policy?.autoPunchOutRequireReview ?? true}
                  onChange={(e) => handlePolicyChange('autoPunchOutRequireReview', e.target.checked)}
                  disabled={!(policy?.autoPunchOutEnabled ?? true)}
                />
                <label className="form-check-label small fw-semibold" htmlFor="autoPunchOutRequireReview">
                  Flag Automatically Generated Checkout Records for Manager Review
                </label>
                <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
                  Marks auto-punched sessions with a review badge for administrative transparency.
                </small>
              </div>

              {/* 4. Employee Notification Option */}
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="autoPunchOutNotifyEmployee"
                  checked={policy?.autoPunchOutNotifyEmployee ?? true}
                  onChange={(e) => handlePolicyChange('autoPunchOutNotifyEmployee', e.target.checked)}
                  disabled={!(policy?.autoPunchOutEnabled ?? true)}
                />
                <label className="form-check-label small fw-semibold" htmlFor="autoPunchOutNotifyEmployee">
                  Notify Employees When Automatic Punch-Out Is Recorded
                </label>
              </div>

              {/* 5. Overtime Approval */}
              <div className="form-check form-switch mb-2 pt-2 border-top">
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
                <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
                  Auto checkouts never classify employees as working overtime beyond the configured checkout time.
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* ── Form Actions ── */}
        <div className="d-flex justify-content-end mb-4">
          <button
            type="submit"
            className="erp-btn erp-btn-primary px-4 py-2"
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

      {/* ── Single Standard Company Shift Summary Card ── */}
      <div className="erp-card bg-white p-3 p-md-4" style={{ border: '1px solid var(--erp-border, #e2e8f0)' }}>
        <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
          <div className="d-flex align-items-center gap-2">
            <Building2 size={18} className="text-primary" />
            <div>
              <h6 className="fw-bold mb-0" style={{ color: 'var(--erp-text-main, #0f172a)' }}>
                Active Company-Wide Shift Overview
              </h6>
              <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                All employees follow this standard shift configuration. Multiple custom shifts are disabled.
              </small>
            </div>
          </div>
          <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1">
            Active Organization Shift
          </span>
        </div>

        <div className="row g-3">
          <div className="col-12 col-sm-6 col-md-3">
            <div className="p-3 rounded-2 bg-light border">
              <span className="text-muted d-block small mb-1">Standard Shift Hours</span>
              <strong className="fs-6" style={{ color: 'var(--erp-text-main, #0f172a)' }}>
                {policy?.standardStartTime || '09:00'} - {policy?.standardEndTime || '18:00'}
              </strong>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-3">
            <div className="p-3 rounded-2 bg-light border">
              <span className="text-muted d-block small mb-1">Required Work Hours</span>
              <strong className="fs-6 text-primary">
                {policy?.requiredWorkHours ?? 8.0} Hours / Day
              </strong>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-3">
            <div className="p-3 rounded-2 bg-light border">
              <span className="text-muted d-block small mb-1">Grace Period & Departure</span>
              <strong className="fs-6" style={{ color: 'var(--erp-text-main, #0f172a)' }}>
                Grace: {policy?.gracePeriodMinutes ?? 15}m | Early: {policy?.earlyDepartureThresholdMinutes ?? 30}m
              </strong>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-3">
            <div className="p-3 rounded-2 bg-light border">
              <span className="text-muted d-block small mb-1">Auto Punch-Out Checkout</span>
              <strong className="fs-6" style={{ color: (policy?.autoPunchOutEnabled ?? true) ? '#16A34A' : '#64748B' }}>
                {(policy?.autoPunchOutEnabled ?? true)
                  ? `${policy?.autoPunchOutTime || policy?.standardEndTime || '18:00'} (${policy?.timezone || 'Asia/Kolkata'})`
                  : 'Disabled'}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendancePolicySettingsPage;
