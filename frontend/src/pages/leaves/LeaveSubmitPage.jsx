import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaveApi } from '../../api/leaveApi';

// Official Enterprise Design System Palette
const ERP = {
  electric: '#087FF5',  // Primary Brand Blue
  navy: '#071A33',      // Deep Navy Sidebar/Headings
  royal: '#0057B8',     // Secondary Blue
  hover: '#1D4ED8',     // Blue Hover
  silver: '#C5CED8',    // Metallic Silver
  bg: '#F4F7FB',        // Ice White Background
  card: '#FFFFFF',      // Card Background
  slate: '#1E293B',     // Primary Text
  gray: '#64748B',      // Secondary Text
  border: '#E2E8F0',    // Light Gray Borders
  success: '#16A34A',   // Green
  successBg: '#DCFCE7', // Green Tint
  warning: '#D97706',   // Amber
  warningBg: '#FEF3C7', // Amber Tint
  error: '#DC2626',     // Red
  errorBg: '#FEE2E2',   // Red Tint
  primaryBg: '#EBF4FE', // Ice Blue Tint
};

// Inline SVGs (Zero font/external CSS dependencies)
const Icons = {
  ArrowLeft: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <line x1="19" y1="12" x2="5" y2="12"></line>
      <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
  ),
  Calendar: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Clock: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  CalendarRange: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h8" />
    </svg>
  ),
  AlertCircle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ERP.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

const LeaveSubmitPage = () => {
  const navigate = useNavigate();

  const [durationMode, setDurationMode] = useState('single'); // 'single' | 'multiple' | 'half'
  const [formData, setFormData] = useState({
    leaveType: 'Sick',
    otherLeaveType: '',
    halfDaySession: 'First Half',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    totalDays: 1,
    reason: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Auto calculate total days
  useEffect(() => {
    if (durationMode === 'single') {
      setFormData((prev) => ({ ...prev, endDate: prev.startDate, totalDays: 1 }));
    } else if (durationMode === 'half') {
      setFormData((prev) => ({ ...prev, endDate: prev.startDate, totalDays: 0.5 }));
    } else if (durationMode === 'multiple' && formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      if (diffDays > 0) {
        setFormData((prev) => ({ ...prev, totalDays: diffDays }));
      } else {
        setFormData((prev) => ({ ...prev, totalDays: 1 }));
      }
    }
  }, [durationMode, formData.startDate, formData.endDate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleModeChange = (mode) => {
    setDurationMode(mode);
    if (mode === 'single' || mode === 'half') {
      setFormData((prev) => ({ ...prev, endDate: prev.startDate }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    if (durationMode === 'multiple' && new Date(formData.endDate) < new Date(formData.startDate)) {
      setError('End date cannot be earlier than start date.');
      setSubmitting(false);
      return;
    }

    if (formData.leaveType === 'Other' && !formData.otherLeaveType.trim()) {
      setError('Please specify your custom leave type.');
      setSubmitting(false);
      return;
    }

    try {
      const finalCategory =
        formData.leaveType === 'Other' && formData.otherLeaveType.trim()
          ? `Other: ${formData.otherLeaveType.trim()}`
          : formData.leaveType;

      const payload = {
        leaveType: finalCategory,
        durationMode,
        halfDaySession: durationMode === 'half' ? formData.halfDaySession : 'None',
        startDate: formData.startDate,
        endDate: durationMode === 'multiple' ? formData.endDate : formData.startDate,
        totalDays: Number(formData.totalDays),
        reason: formData.reason.trim(),
      };

      const res = await leaveApi.submitLeave(payload);
      if (res.data?.success || res.status === 200 || res.status === 201) {
        navigate('/leaves');
      } else {
        setError(res.data?.message || 'Failed to submit leave request');
      }
    } catch (err) {
      console.error('Leave Submission Error:', err);
      setError(err.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        .erp-hover-btn {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .erp-hover-btn:hover {
          transform: translateY(-2px);
          filter: brightness(1.04);
          box-shadow: 0 4px 14px rgba(8, 127, 245, 0.22) !important;
        }
        .erp-back-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid ${ERP.border};
          background-color: ${ERP.card};
          color: ${ERP.navy};
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          flex-shrink: 0;
        }
        .erp-back-btn:hover {
          background-color: ${ERP.primaryBg};
          color: ${ERP.electric};
          border-color: ${ERP.electric};
          transform: scale(1.08);
          box-shadow: 0 4px 12px rgba(8, 127, 245, 0.15);
        }
        .erp-mode-card {
          transition: all 0.2s ease;
        }
        .erp-mode-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        }
      `}</style>

      {/* Main Page Canvas with Fluid Responsive Padding */}
      <div
        className="w-100 px-3 px-sm-4 px-xl-5 py-4"
        style={{
          backgroundColor: ERP.bg,
          minHeight: '100vh',
          color: ERP.slate,
          boxSizing: 'border-box',
        }}
      >
        <div className="mx-auto" style={{ maxWidth: '720px' }}>
          
          {/* HEADER BAR WITH ERGONOMIC BACK BUTTON */}
          <div
            className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4 p-3.5 p-sm-4 rounded-4 shadow-sm"
            style={{
              backgroundColor: ERP.card,
              border: `1px solid ${ERP.border}`,
            }}
          >
            <div className="d-flex align-items-center gap-3">
              {/* Back Button */}
              <button
                type="button"
                className="erp-back-btn shadow-sm"
                onClick={() => navigate('/leaves')}
                title="Back to Leaves Dashboard"
              >
                <Icons.ArrowLeft />
              </button>

              <div>
                <div className="d-flex align-items-center gap-2 mb-1.5">
                  <span
                    className="badge rounded-pill fw-bold"
                    style={{
                      backgroundColor: ERP.primaryBg,
                      color: ERP.electric,
                      fontSize: '0.68rem',
                      letterSpacing: '0.5px',
                    }}
                  >
                    WORKFORCE ATTENDANCE
                  </span>
                </div>
                <h4 className="fw-bold mb-1" style={{ color: ERP.navy, fontSize: '1.35rem', letterSpacing: '-0.3px' }}>
                  Apply for Leave
                </h4>
                <p className="small mb-0 text-muted" style={{ fontSize: '0.80rem' }}>
                  Submit scheduled time off, half-day, or sick leaves for approval.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-light fw-semibold px-3.5 py-2 w-100 w-sm-auto text-nowrap rounded-3 erp-hover-btn d-none d-sm-inline-flex align-items-center justify-content-center"
              style={{
                border: `1px solid ${ERP.silver}`,
                backgroundColor: ERP.card,
                color: ERP.slate,
                fontSize: '0.82rem',
              }}
              onClick={() => navigate('/leaves')}
            >
              Cancel / Dashboard
            </button>
          </div>

          {/* MAIN FORM CARD */}
          <div
            className="p-3.5 p-sm-4 rounded-4 shadow-sm mb-4"
            style={{
              backgroundColor: ERP.card,
              border: `1px solid ${ERP.border}`,
            }}
          >
            {/* Error Notification Alert */}
            {error && (
              <div
                className="alert d-flex align-items-center gap-2 p-3 mb-4 rounded-3 shadow-sm"
                style={{
                  backgroundColor: ERP.errorBg,
                  border: `1px solid #FCA5A5`,
                  color: ERP.error,
                  fontSize: '0.82rem',
                }}
              >
                <Icons.AlertCircle />
                <span className="fw-semibold">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              
              {/* 1. DURATION MODE SELECTOR */}
              <div className="mb-4">
                <label
                  className="form-label fw-bold text-uppercase mb-2.5 d-block"
                  style={{ color: ERP.gray, fontSize: '0.72rem', letterSpacing: '0.5px' }}
                >
                  1. Select Duration Mode <span style={{ color: ERP.error }}>*</span>
                </label>

                <div className="row g-2.5">
                  {[
                    { id: 'single', label: 'Single Day', icon: <Icons.Calendar /> },
                    { id: 'multiple', label: 'Multi Days', icon: <Icons.CalendarRange /> },
                    { id: 'half', label: 'Half Day', icon: <Icons.Clock /> },
                  ].map((mode) => {
                    const isActive = durationMode === mode.id;
                    return (
                      <div className="col-4" key={mode.id}>
                        <button
                          type="button"
                          className="btn w-100 fw-bold d-inline-flex align-items-center justify-content-center py-2.5 erp-mode-card"
                          style={{
                            minHeight: '44px',
                            fontSize: '0.82rem',
                            borderRadius: '10px',
                            border: `1.5px solid ${isActive ? ERP.electric : ERP.border}`,
                            backgroundColor: isActive ? ERP.primaryBg : ERP.card,
                            color: isActive ? ERP.royal : ERP.slate,
                            gap: '7px',
                            boxShadow: isActive ? '0 2px 8px rgba(8, 127, 245, 0.18)' : 'none',
                          }}
                          onClick={() => handleModeChange(mode.id)}
                        >
                          {mode.icon}
                          <span>{mode.label}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. LEAVE CLASSIFICATION / TYPE (Only Sick, Casual & Other) */}
              <div className="mb-4">
                <label className="form-label fw-bold small mb-1.5 d-block" style={{ color: ERP.slate, fontSize: '0.78rem' }}>
                  Leave Classification <span style={{ color: ERP.error }}>*</span>
                </label>
                <select
                  className="form-select shadow-none"
                  name="leaveType"
                  value={formData.leaveType}
                  onChange={handleChange}
                  style={{
                    height: '44px',
                    borderRadius: '8px',
                    borderColor: ERP.border,
                    fontSize: '0.86rem',
                    backgroundColor: ERP.card,
                    color: ERP.slate,
                    padding: '8px 14px',
                  }}
                  required
                >
                  <option value="Sick">🤒 Sick Leave</option>
                  <option value="Casual">🏖️ Casual Leave</option>
                  <option value="Other">📝 Other (Specify Below)</option>
                </select>

                {/* Custom Leave Type Text Box (Displayed when "Other" is selected) */}
                {formData.leaveType === 'Other' && (
                  <div className="mt-2.5 p-2.5 rounded-3 border" style={{ backgroundColor: '#F8FAFC' }}>
                    <label className="form-label fw-bold small text-muted mb-1" style={{ fontSize: '0.74rem' }}>
                      Specify Other Leave Classification <span style={{ color: ERP.error }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control shadow-none"
                      name="otherLeaveType"
                      placeholder="e.g., Bereavement, Emergency, Medical Appointment..."
                      value={formData.otherLeaveType}
                      onChange={handleChange}
                      required
                      autoFocus
                      style={{
                        borderRadius: '7px',
                        borderColor: ERP.electric,
                        backgroundColor: '#FFFFFF',
                        fontSize: '0.84rem',
                        padding: '10px 14px',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* 3. HALF DAY SESSIONS (Only shown in Half-Day mode) */}
              {durationMode === 'half' && (
                <div
                  className="p-3.5 rounded-3 mb-4"
                  style={{ backgroundColor: '#F8FAFC', border: `1px solid ${ERP.border}` }}
                >
                  <label className="form-label fw-bold small mb-2 d-block" style={{ color: ERP.royal, fontSize: '0.78rem' }}>
                    Select Half Day Session <span style={{ color: ERP.error }}>*</span>
                  </label>

                  <div className="d-flex flex-wrap gap-4">
                    <div className="form-check d-flex align-items-center gap-2 m-0">
                      <input
                        className="form-check-input shadow-none"
                        type="radio"
                        name="halfDaySession"
                        id="firstHalf"
                        value="First Half"
                        checked={formData.halfDaySession === 'First Half'}
                        onChange={handleChange}
                        style={{ cursor: 'pointer' }}
                      />
                      <label className="form-check-label small fw-semibold" htmlFor="firstHalf" style={{ color: ERP.slate, fontSize: '0.82rem', cursor: 'pointer' }}>
                        First Half (Morning)
                      </label>
                    </div>

                    <div className="form-check d-flex align-items-center gap-2 m-0">
                      <input
                        className="form-check-input shadow-none"
                        type="radio"
                        name="halfDaySession"
                        id="secondHalf"
                        value="Second Half"
                        checked={formData.halfDaySession === 'Second Half'}
                        onChange={handleChange}
                        style={{ cursor: 'pointer' }}
                      />
                      <label className="form-check-label small fw-semibold" htmlFor="secondHalf" style={{ color: ERP.slate, fontSize: '0.82rem', cursor: 'pointer' }}>
                        Second Half (Afternoon)
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. DATE PICKERS */}
              <div className="row g-3 mb-4">
                {durationMode === 'multiple' ? (
                  <>
                    <div className="col-12 col-sm-6">
                      <label className="form-label fw-bold small mb-1.5 d-block" style={{ color: ERP.slate, fontSize: '0.78rem' }}>
                        Start Date <span style={{ color: ERP.error }}>*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control shadow-none"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleChange}
                        style={{
                          height: '44px',
                          borderRadius: '8px',
                          borderColor: ERP.border,
                          fontSize: '0.86rem',
                          backgroundColor: ERP.card,
                          color: ERP.slate,
                          padding: '10px 14px',
                        }}
                        required
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label fw-bold small mb-1.5 d-block" style={{ color: ERP.slate, fontSize: '0.78rem' }}>
                        End Date <span style={{ color: ERP.error }}>*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control shadow-none"
                        name="endDate"
                        min={formData.startDate}
                        value={formData.endDate}
                        onChange={handleChange}
                        style={{
                          height: '44px',
                          borderRadius: '8px',
                          borderColor: ERP.border,
                          fontSize: '0.86rem',
                          backgroundColor: ERP.card,
                          color: ERP.slate,
                          padding: '10px 14px',
                        }}
                        required
                      />
                    </div>
                  </>
                ) : (
                  <div className="col-12">
                    <label className="form-label fw-bold small mb-1.5 d-block" style={{ color: ERP.slate, fontSize: '0.78rem' }}>
                      Leave Date <span style={{ color: ERP.error }}>*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control shadow-none"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      style={{
                        height: '44px',
                        borderRadius: '8px',
                        borderColor: ERP.border,
                        fontSize: '0.86rem',
                        backgroundColor: ERP.card,
                        color: ERP.slate,
                        padding: '10px 14px',
                      }}
                      required
                    />
                  </div>
                )}
              </div>

              {/* 5. DURATION SUMMARY CARD */}
              <div
                className="p-3 mb-4 rounded-3 d-flex align-items-center justify-content-between shadow-sm"
                style={{ backgroundColor: ERP.primaryBg, border: `1px solid #BFDBFE` }}
              >
                <span className="small fw-bold" style={{ color: ERP.royal, fontSize: '0.82rem' }}>
                  Total Deductible Leave:
                </span>
                <span
                  className="badge rounded-pill font-monospace fw-bold px-3 py-1.5 shadow-sm"
                  style={{ backgroundColor: ERP.navy, color: '#FFFFFF', fontSize: '0.82rem' }}
                >
                  {formData.totalDays} {formData.totalDays === 0.5 ? 'Day (Half)' : formData.totalDays === 1 ? 'Day' : 'Days'}
                </span>
              </div>

              {/* 6. REASON / REMARKS */}
              <div className="mb-4">
                <label className="form-label fw-bold small mb-1.5 d-block" style={{ color: ERP.slate, fontSize: '0.78rem' }}>
                  Reason for Absence <span style={{ color: ERP.error }}>*</span>
                </label>
                <textarea
                  className="form-control shadow-none"
                  name="reason"
                  rows="3"
                  placeholder="Provide a clear description for managerial & HR approval..."
                  value={formData.reason}
                  onChange={handleChange}
                  style={{
                    borderRadius: '8px',
                    borderColor: ERP.border,
                    fontSize: '0.86rem',
                    backgroundColor: ERP.card,
                    color: ERP.slate,
                    padding: '12px 14px',
                  }}
                  required
                ></textarea>
              </div>

              {/* 7. ACTION BUTTONS (Stack on Mobile, Align on Desktop) */}
              <div
                className="d-flex flex-column-reverse flex-sm-row justify-content-end gap-2.5 pt-3.5 border-top"
                style={{ borderColor: ERP.border }}
              >
                <button
                  type="button"
                  className="btn btn-light fw-semibold w-100 w-sm-auto rounded-3 erp-hover-btn"
                  style={{
                    border: `1px solid ${ERP.silver}`,
                    height: '42px',
                    padding: '0 20px',
                    fontSize: '0.84rem',
                    color: ERP.slate,
                  }}
                  onClick={() => navigate('/leaves')}
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  className="btn text-white fw-bold shadow-sm w-100 w-sm-auto rounded-3 erp-hover-btn"
                  style={{
                    backgroundColor: ERP.electric,
                    border: 'none',
                    height: '42px',
                    padding: '0 26px',
                    fontSize: '0.84rem',
                  }}
                  disabled={submitting}
                >
                  {submitting ? (
                    <span>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Submitting...
                    </span>
                  ) : (
                    'Submit Leave Request'
                  )}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </>
  );
};

export default LeaveSubmitPage;