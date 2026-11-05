import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  LogIn,
  LogOut,
  CalendarDays,
  Ticket,
  Receipt,
} from 'lucide-react';

const DashboardAttendanceHeader = ({
  attendanceToday,
  monthlySummary = { present: 17, absent: 5, missing: 0, late: 0 },
  onPunchIn,
  onPunchOut,
  punchLoading = false,
  liveTime = new Date(),
  user,
}) => {
  // Normalize attendance object (can be inside attendanceToday.attendance or directly on attendanceToday)
  const actualAttendance = attendanceToday?.attendance || (attendanceToday?.punchIn ? attendanceToday : null);

  const isPunchedIn = Boolean(actualAttendance?.punchIn?.time && !actualAttendance?.punchOut?.time);
  const isPunchedOut = Boolean(actualAttendance?.punchOut?.time);

  // Formatted punch-in time (HH:mm)
  const checkInDisplay = useMemo(() => {
    if (actualAttendance?.punchIn?.time) {
      const dt = new Date(actualAttendance.punchIn.time);
      return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return '--:--';
  }, [actualAttendance]);

  // Formatted punch-out time (HH:mm)
  const checkOutDisplay = useMemo(() => {
    if (actualAttendance?.punchOut?.time) {
      const dt = new Date(actualAttendance.punchOut.time);
      return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return '--:--';
  }, [actualAttendance]);

  // Formatted working hours (e.g. 08:30 or --:--)
  const workingHoursDisplay = useMemo(() => {
    if (actualAttendance?.workingHours && actualAttendance.workingHours > 0) {
      const totalMins = Math.round(actualAttendance.workingHours * 60);
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }
    if (actualAttendance?.actualWorkedMinutes && actualAttendance.actualWorkedMinutes > 0) {
      const hrs = Math.floor(actualAttendance.actualWorkedMinutes / 60);
      const mins = actualAttendance.actualWorkedMinutes % 60;
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }
    return '--:--';
  }, [actualAttendance]);

  // Pill date format: Today (DD/MM) e.g. Today (30/10)
  const todayDatePill = useMemo(() => {
    const day = String(liveTime.getDate()).padStart(2, '0');
    const month = String(liveTime.getMonth() + 1).padStart(2, '0');
    return `Today (${day}/${month})`;
  }, [liveTime]);

  // Monthly summary label: MONTHLY SUMMARY (OCTOBER)
  const currentMonthName = useMemo(() => {
    return liveTime.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  }, [liveTime]);

  return (
    <div className="mb-4">
      <style>{`
        .erp-overview-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          padding: 8px 18px;
          border-radius: 12px;
          border: 1px solid transparent;
          font-size: 0.92rem;
          transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
          text-decoration: none;
          cursor: pointer;
          white-space: nowrap;
        }
        .erp-overview-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        .erp-overview-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .erp-overview-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .erp-btn-icon-box {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          flex-shrink: 0;
        }

        .erp-monthly-stat-card {
          padding: 14px 18px;
          border-radius: 12px;
          height: 100%;
          display: flex;
          align-items: center;
          gap: 14px;
          transition: all 0.18s ease-in-out;
        }
        .erp-monthly-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
        }

        .erp-stat-dot-box {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background-color: #ffffff;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .erp-stat-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          display: inline-block;
        }
      `}</style>

      {/* ── 1. Top Quick Action Buttons Row (Check In, Check Out, Apply Leave, Book Service Ticket, Add Expense) ── */}
      <div className="d-flex flex-wrap align-items-center gap-2.5 mb-3.5">
        {/* Check In Button */}
        <button
          type="button"
          onClick={onPunchIn}
          disabled={punchLoading || isPunchedIn || isPunchedOut}
          className="erp-overview-btn text-white shadow-xs"
          style={{
            backgroundColor: '#16a34a',
            borderColor: '#16a34a',
          }}
          title={
            isPunchedIn
              ? 'Already clocked in for today'
              : isPunchedOut
              ? 'Shift completed for today'
              : 'Clock in for your shift'
          }
        >
          <span
            className="erp-btn-icon-box"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.22)' }}
          >
            <LogIn size={16} strokeWidth={2.4} />
          </span>
          <span>{punchLoading && !isPunchedIn ? 'Checking In...' : 'Check In'}</span>
        </button>

        {/* Check Out Button */}
        <button
          type="button"
          onClick={onPunchOut}
          disabled={punchLoading || !isPunchedIn}
          className="erp-overview-btn text-white shadow-xs"
          style={{
            backgroundColor: '#dc2626',
            borderColor: '#dc2626',
          }}
          title={
            !isPunchedIn
              ? 'You must check in first before checking out'
              : 'Clock out and complete today’s shift'
          }
        >
          <span
            className="erp-btn-icon-box"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.22)' }}
          >
            <LogOut size={16} strokeWidth={2.4} />
          </span>
          <span>{punchLoading && isPunchedIn ? 'Checking Out...' : 'Check Out'}</span>
        </button>

        {/* Apply Leave Button */}
        <Link
          to="/leaves/submit"
          className="erp-overview-btn text-white shadow-xs"
          style={{
            backgroundColor: '#2563eb',
            borderColor: '#2563eb',
          }}
        >
          <span
            className="erp-btn-icon-box"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.22)' }}
          >
            <CalendarDays size={16} strokeWidth={2.2} />
          </span>
          <span>Apply Leave</span>
        </Link>

        {/* Book Service Ticket Button */}
        <Link
          to="/tickets"
          state={{ openBooking: true }}
          className="erp-overview-btn bg-white shadow-xs"
          style={{
            color: '#4f46e5',
            borderColor: '#e0e7ff',
          }}
        >
          <span
            className="erp-btn-icon-box"
            style={{ backgroundColor: '#eef2ff', color: '#4f46e5' }}
          >
            <Ticket size={16} strokeWidth={2.2} />
          </span>
          <span>Book Service Ticket</span>
        </Link>

        {/* Add Expense Button */}
        <Link
          to="/expenses/submit"
          className="erp-overview-btn bg-white shadow-xs"
          style={{
            color: '#059669',
            borderColor: '#d1fae5',
          }}
        >
          <span
            className="erp-btn-icon-box"
            style={{ backgroundColor: '#ecfdf5', color: '#059669' }}
          >
            <Receipt size={16} strokeWidth={2.2} />
          </span>
          <span>Add Expense</span>
        </Link>
      </div>

      {/* ── 2. Attendance Overview Main Card ── */}
      <div
        className="card border shadow-xs"
        style={{
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0',
          borderRadius: '16px',
          padding: '24px',
        }}
      >
        {/* Card Header */}
        <div className="d-flex align-items-start justify-content-between mb-3.5">
          <div>
            <h5
              className="fw-bold mb-1 text-dark"
              style={{ fontSize: '1.28rem', letterSpacing: '-0.02em' }}
            >
              Attendance Overview
            </h5>
            <p className="text-muted small mb-0" style={{ fontSize: '0.85rem' }}>
              Track your time for today and this month
            </p>
          </div>
          <div>
            <span
              className="badge rounded-pill fw-semibold d-inline-flex align-items-center gap-1.5"
              style={{
                backgroundColor: '#dcfce7',
                color: '#15803d',
                padding: '6px 14px',
                fontSize: '0.82rem',
                border: '1px solid #bbf7d0',
              }}
            >
              <span
                className="rounded-circle"
                style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#16a34a',
                  display: 'inline-block',
                }}
              />
              {todayDatePill}
            </span>
          </div>
        </div>

        {/* 3-Column Today's Time Box */}
        <div
          className="rounded-3 mb-4"
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #edf2f6',
            padding: '22px 20px',
            borderRadius: '12px',
          }}
        >
          <div className="row g-0 align-items-center text-center">
            {/* CHECK IN */}
            <div className="col-4">
              <div
                className="text-uppercase fw-bold text-muted mb-1"
                style={{ fontSize: '0.74rem', letterSpacing: '0.08em', color: '#64748b' }}
              >
                CHECK IN
              </div>
              <div
                className="fw-bold text-dark font-monospace"
                style={{ fontSize: '1.85rem', lineHeight: 1.15, letterSpacing: '-0.02em' }}
              >
                {checkInDisplay}
              </div>
            </div>

            {/* CHECK OUT (with vertical dividers) */}
            <div
              className="col-4 border-start border-end"
              style={{ borderColor: '#e2e8f0' }}
            >
              <div
                className="text-uppercase fw-bold text-muted mb-1"
                style={{ fontSize: '0.74rem', letterSpacing: '0.08em', color: '#64748b' }}
              >
                CHECK OUT
              </div>
              <div
                className="fw-bold text-dark font-monospace"
                style={{ fontSize: '1.85rem', lineHeight: 1.15, letterSpacing: '-0.02em' }}
              >
                {checkOutDisplay}
              </div>
            </div>

            {/* WORKING HOURS */}
            <div className="col-4">
              <div
                className="text-uppercase fw-bold text-muted mb-1"
                style={{ fontSize: '0.74rem', letterSpacing: '0.08em', color: '#64748b' }}
              >
                WORKING HOURS
              </div>
              <div
                className="fw-bold text-dark font-monospace"
                style={{ fontSize: '1.85rem', lineHeight: 1.15, letterSpacing: '-0.02em' }}
              >
                {workingHoursDisplay}
              </div>
            </div>
          </div>
        </div>

        {/* MONTHLY SUMMARY SECTION */}
        <div>
          <div
            className="text-uppercase fw-bold mb-2.5"
            style={{
              fontSize: '0.74rem',
              letterSpacing: '0.08em',
              color: '#475569',
            }}
          >
            MONTHLY SUMMARY ({currentMonthName})
          </div>

          <div className="row g-3">
            {/* 1. Present */}
            <div className="col-6 col-md-3">
              <div
                className="erp-monthly-stat-card"
                style={{
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #d1fae5',
                }}
              >
                <div className="erp-stat-dot-box">
                  <span
                    className="erp-stat-dot"
                    style={{ backgroundColor: '#10b981' }}
                  />
                </div>
                <div>
                  <div
                    className="text-muted fw-medium"
                    style={{ fontSize: '0.78rem', color: '#64748b' }}
                  >
                    Present
                  </div>
                  <div
                    className="fw-bold text-dark"
                    style={{ fontSize: '1.18rem', lineHeight: 1.2 }}
                  >
                    {monthlySummary.present ?? 17} Days
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Absent */}
            <div className="col-6 col-md-3">
              <div
                className="erp-monthly-stat-card"
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fee2e2',
                }}
              >
                <div className="erp-stat-dot-box">
                  <span
                    className="erp-stat-dot"
                    style={{ backgroundColor: '#ef4444' }}
                  />
                </div>
                <div>
                  <div
                    className="text-muted fw-medium"
                    style={{ fontSize: '0.78rem', color: '#64748b' }}
                  >
                    Absent
                  </div>
                  <div
                    className="fw-bold text-dark"
                    style={{ fontSize: '1.18rem', lineHeight: 1.2 }}
                  >
                    {monthlySummary.absent ?? 5} Days
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Missing */}
            <div className="col-6 col-md-3">
              <div
                className="erp-monthly-stat-card"
                style={{
                  backgroundColor: '#eff6ff',
                  border: '1px solid #dbeafe',
                }}
              >
                <div className="erp-stat-dot-box">
                  <span
                    className="erp-stat-dot"
                    style={{ backgroundColor: '#3b82f6' }}
                  />
                </div>
                <div>
                  <div
                    className="text-muted fw-medium"
                    style={{ fontSize: '0.78rem', color: '#64748b' }}
                  >
                    Missing
                  </div>
                  <div
                    className="fw-bold text-dark"
                    style={{ fontSize: '1.18rem', lineHeight: 1.2 }}
                  >
                    {monthlySummary.missing !== undefined && monthlySummary.missing !== null
                      ? `${monthlySummary.missing} Days`
                      : 'Days'}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Late */}
            <div className="col-6 col-md-3">
              <div
                className="erp-monthly-stat-card"
                style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fef3c7',
                }}
              >
                <div className="erp-stat-dot-box">
                  <span
                    className="erp-stat-dot"
                    style={{ backgroundColor: '#f59e0b' }}
                  />
                </div>
                <div>
                  <div
                    className="text-muted fw-medium"
                    style={{ fontSize: '0.78rem', color: '#64748b' }}
                  >
                    Late
                  </div>
                  <div
                    className="fw-bold text-dark"
                    style={{ fontSize: '1.18rem', lineHeight: 1.2 }}
                  >
                    {monthlySummary.late ?? 0} Days
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardAttendanceHeader;