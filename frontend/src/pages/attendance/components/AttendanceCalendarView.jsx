import React, { useState, useEffect } from 'react';
import { getMyCalendar, getAllAttendance } from '../../../api/attendanceApi';

// ERP Design Tokens & Status Configurations
const THEME = {
  navy: '#0F172A',
  primary: '#2563EB',
  border: '#E2E8F0',
  surface: '#F8FAFC',
  cardBg: '#FFFFFF',
  textSecondary: '#64748B',
};

const STATUS_CONFIG = {
  'Present': { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: 'Present', short: 'P' },
  'Late': { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'Late', short: 'L' },
  'Half-Day': { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', label: 'Half Day', short: 'HD' },
  'Absent': { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Absent', short: 'A' },
  'Leave': { color: '#475569', bg: '#F1F5F9', border: '#CBD5E1', label: 'Leave', short: 'LV' },
  'Weekly-Off': { color: '#94A3B8', bg: '#F8FAFC', border: '#E2E8F0', label: 'Off Day', short: 'OFF' },
  'Holiday': { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', label: 'Holiday', short: 'HOL' },
  'Incomplete': { color: '#C2410C', bg: '#FFF7ED', border: '#FED7AA', label: 'Incomplete', short: 'INC' },
};

const AttendanceCalendarView = ({ isAdminView = false, selectedUserId = null }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedDayRecord, setSelectedDayRecord] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      if (!isAdminView || !selectedUserId) {
        const res = await getMyCalendar({ year, month });
        if (res && res.success) {
          setRecords(res.data.records || {});
        }
      } else {
        const prefix = `${year}-${String(month).padStart(2, '0')}`;
        const res = await getAllAttendance({
          startDate: `${prefix}-01`,
          endDate: `${prefix}-31`,
          search: selectedUserId,
          limit: 31,
        });
        if (res && res.success) {
          const map = {};
          (res.data.records || []).forEach((r) => {
            map[r.date] = r;
          });
          setRecords(map);
        }
      }
    } catch (error) {
      console.error('Error fetching calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, [currentDate, selectedUserId]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Generate Calendar Days Grid
  const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayStr = new Date().toISOString().split('T')[0];

  const daysArray = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  const handleDayClick = (day) => {
    if (!day) return;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const record = records[dateStr] || {
      date: dateStr,
      status: new Date(year, month - 1, day).getDay() === 0 ? 'Weekly-Off' : 'No Record',
    };
    setSelectedDayRecord(record);
    setShowModal(true);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div
      className="rounded-3 shadow-sm p-3 p-md-4 mb-4"
      style={{
        backgroundColor: THEME.cardBg,
        border: `1px solid ${THEME.border}`,
      }}
    >
      {/* Calendar Header */}
      <div
        className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3 pb-3 border-bottom"
        style={{ borderColor: THEME.border }}
      >
        <div className="d-flex align-items-center gap-2">
          <span
            style={{
              backgroundColor: '#EFF6FF',
              color: THEME.primary,
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '1.1rem',
            }}
          >
            📅
          </span>
          <div>
            <h5 className="fw-bold mb-0" style={{ color: THEME.navy, letterSpacing: '-0.02em' }}>
              {monthNames[month - 1]} {year}
            </h5>
            <small className="text-muted">Monthly Attendance & Compliance Grid</small>
          </div>
        </div>

        {/* Legend & Navigation Actions */}
        <div className="d-flex flex-wrap align-items-center justify-content-between justify-content-md-end gap-2">
          {/* Quick Legend for Desktop */}
          <div className="d-none d-lg-flex align-items-center gap-1.5 me-2">
            {[
              { label: 'Present', ...STATUS_CONFIG['Present'] },
              { label: 'Late', ...STATUS_CONFIG['Late'] },
              { label: 'Half-Day', ...STATUS_CONFIG['Half-Day'] },
              { label: 'Absent', ...STATUS_CONFIG['Absent'] },
            ].map((lg, i) => (
              <span
                key={i}
                className="badge"
                style={{
                  backgroundColor: lg.bg,
                  color: lg.color,
                  border: `1px solid ${lg.border}`,
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 8px',
                }}
              >
                {lg.label}
              </span>
            ))}
          </div>

          <div className="d-flex align-items-center gap-1">
            <button
              className="btn btn-sm btn-light border px-2.5"
              onClick={handleToday}
              style={{ fontSize: '12px', height: '32px', borderColor: THEME.border, fontWeight: 600 }}
            >
              Today
            </button>
            <div className="btn-group btn-group-sm" role="group">
              <button
                className="btn btn-outline-secondary"
                onClick={handlePrevMonth}
                title="Previous Month"
                style={{ height: '32px', borderColor: THEME.border }}
              >
                ‹
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={handleNextMonth}
                title="Next Month"
                style={{ height: '32px', borderColor: THEME.border }}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Weekday Row */}
      <div
        className="d-grid text-center fw-bold small text-secondary mb-2"
        style={{
          gridTemplateColumns: 'repeat(7, 1fr)',
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        <span style={{ color: '#DC2626' }}>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>

      {/* Days Grid */}
      <div
        className="d-grid gap-1.5"
        style={{
          gridTemplateColumns: 'repeat(7, 1fr)',
          minHeight: '360px',
        }}
      >
        {daysArray.map((day, idx) => {
          if (day === null) {
            return (
              <div
                key={`empty-${idx}`}
                className="rounded-2 p-1 p-md-2"
                style={{
                  backgroundColor: '#F8FAFC',
                  opacity: 0.4,
                  minHeight: '62px',
                  border: '1px dashed #E2E8F0',
                }}
              />
            );
          }

          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isToday = dateStr === todayStr;
          const record = records[dateStr];
          const isSunday = new Date(year, month - 1, day).getDay() === 0;

          let statusKey = 'Weekly-Off';
          if (record) {
            if (record.lateMinutes > 0) statusKey = 'Late';
            else statusKey = record.status || 'Present';
          } else if (!isSunday && dateStr < todayStr) {
            statusKey = 'Absent';
          } else if (isSunday) {
            statusKey = 'Weekly-Off';
          } else {
            statusKey = null; // Future day
          }

          const statusStyle = statusKey ? STATUS_CONFIG[statusKey] || STATUS_CONFIG['Present'] : null;

          return (
            <div
              key={`day-${day}`}
              onClick={() => handleDayClick(day)}
              className="rounded-2 p-1 p-md-2 d-flex flex-column justify-content-between position-relative"
              style={{
                backgroundColor: isToday ? '#EFF6FF' : '#FFFFFF',
                border: isToday ? `2px solid ${THEME.primary}` : `1px solid ${THEME.border}`,
                minHeight: '68px',
                cursor: 'pointer',
                transition: 'all 0.15s ease-in-out',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = THEME.primary)}
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = isToday ? THEME.primary : THEME.border)
              }
            >
              {/* Day Number Header */}
              <div className="d-flex justify-content-between align-items-center">
                <span
                  className="fw-bold"
                  style={{
                    color: isSunday ? '#DC2626' : THEME.navy,
                    fontSize: '12px',
                  }}
                >
                  {day}
                </span>
                {isToday && (
                  <span
                    className="badge rounded-pill text-white d-none d-sm-inline"
                    style={{ backgroundColor: THEME.primary, fontSize: '9px', padding: '2px 5px' }}
                  >
                    Today
                  </span>
                )}
              </div>

              {/* Status Indicator (Responsive Desktop pill vs Mobile dot/short badge) */}
              {statusStyle && (
                <div className="mt-1">
                  {/* Desktop view */}
                  <div
                    className="d-none d-sm-block rounded px-1 py-0.5 text-truncate text-center"
                    style={{
                      backgroundColor: statusStyle.bg,
                      color: statusStyle.color,
                      border: `1px solid ${statusStyle.border}`,
                      fontSize: '10px',
                      fontWeight: 600,
                    }}
                  >
                    {statusStyle.label}
                    {record?.workingHours ? ` (${record.workingHours}h)` : ''}
                  </div>

                  {/* Mobile view */}
                  <div
                    className="d-block d-sm-none text-center rounded py-0.5 fw-bold"
                    style={{
                      backgroundColor: statusStyle.bg,
                      color: statusStyle.color,
                      border: `1px solid ${statusStyle.border}`,
                      fontSize: '9px',
                    }}
                    title={statusStyle.label}
                  >
                    {statusStyle.short}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Date Details Modal with Frosted Glass Backdrop */}
      {showModal && selectedDayRecord && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 1060,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="p-4 rounded-3 shadow-lg"
            style={{
              backgroundColor: '#FFFFFF',
              width: '100%',
              maxWidth: '430px',
              border: `1px solid ${THEME.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom" style={{ borderColor: THEME.border }}>
              <div>
                <h6 className="fw-bold mb-0" style={{ color: THEME.navy }}>
                  Shift Audit: {selectedDayRecord.date}
                </h6>
                <small className="text-secondary">Punch logs and compliance verification</small>
              </div>
              <button className="btn-close" onClick={() => setShowModal(false)}></button>
            </div>

            <div className="small">
              <div className="d-flex justify-content-between py-2 border-bottom" style={{ borderColor: '#F1F5F9' }}>
                <span className="text-secondary">Status:</span>
                <span
                  className="badge"
                  style={{
                    backgroundColor: STATUS_CONFIG[selectedDayRecord.status]?.bg || '#F1F5F9',
                    color: STATUS_CONFIG[selectedDayRecord.status]?.color || THEME.navy,
                    border: `1px solid ${STATUS_CONFIG[selectedDayRecord.status]?.border || '#E2E8F0'}`,
                    fontSize: '11px',
                  }}
                >
                  {selectedDayRecord.status || 'No record'}
                </span>
              </div>

              <div className="d-flex justify-content-between py-2 border-bottom" style={{ borderColor: '#F1F5F9' }}>
                <span className="text-secondary">Punch In:</span>
                <span className="fw-semibold" style={{ color: THEME.navy }}>
                  {selectedDayRecord.punchIn?.time
                    ? new Date(selectedDayRecord.punchIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '-'}
                </span>
              </div>

              <div className="d-flex justify-content-between py-2 border-bottom" style={{ borderColor: '#F1F5F9' }}>
                <span className="text-secondary">Punch Out:</span>
                <span className="fw-semibold" style={{ color: THEME.navy }}>
                  {selectedDayRecord.punchOut?.time
                    ? new Date(selectedDayRecord.punchOut.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '-'}
                </span>
              </div>

              <div className="d-flex justify-content-between py-2 border-bottom" style={{ borderColor: '#F1F5F9' }}>
                <span className="text-secondary">Effective Hours:</span>
                <span className="fw-bold" style={{ color: THEME.primary }}>
                  {selectedDayRecord.workingHours || 0} hrs
                </span>
              </div>

              <div className="d-flex justify-content-between py-2 border-bottom" style={{ borderColor: '#F1F5F9' }}>
                <span className="text-secondary">Delay / Lateness:</span>
                <span className={`fw-semibold ${selectedDayRecord.lateMinutes > 0 ? 'text-warning' : 'text-muted'}`}>
                  {selectedDayRecord.lateMinutes > 0 ? `+${selectedDayRecord.lateMinutes} mins` : '0 mins (On-time)'}
                </span>
              </div>

              <div className="d-flex justify-content-between py-2 border-bottom" style={{ borderColor: '#F1F5F9' }}>
                <span className="text-secondary">Overtime Logged:</span>
                <span className="fw-semibold text-success">
                  {selectedDayRecord.overtimeMinutes
                    ? `${(selectedDayRecord.overtimeMinutes / 60).toFixed(1)} hrs`
                    : '0 hrs'}
                </span>
              </div>

              <div className="d-flex justify-content-between py-2 border-bottom" style={{ borderColor: '#F1F5F9' }}>
                <span className="text-secondary">Check-Out Method:</span>
                <span className="badge bg-light text-secondary border">
                  {selectedDayRecord.punchOut?.method || (selectedDayRecord.isAutoPunchOut ? 'Auto Punch-Out' : 'Biometric Terminal')}
                </span>
              </div>

              {selectedDayRecord.isAutoPunchOut && selectedDayRecord.autoPunchOutReason && (
                <div
                  className="alert alert-warning p-2 mt-3 mb-0 small rounded-2"
                  style={{ border: '1px solid #FDE68A' }}
                >
                  <strong>Notice:</strong> {selectedDayRecord.autoPunchOutReason}
                </div>
              )}
            </div>

            <div className="mt-4 text-end">
              <button
                className="btn btn-sm btn-primary px-3"
                style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                onClick={() => setShowModal(false)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceCalendarView;