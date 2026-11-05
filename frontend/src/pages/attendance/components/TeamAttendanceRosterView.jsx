import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  MapPin,
  Users,
  Search,
  ExternalLink,
} from 'lucide-react';
import { getTeamAttendanceRoster } from '../../../api/attendanceApi';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { getDisplayAddress } from '../../../utils/reverseGeocode';

const toLocalDateString = (d) => {
  if (!d) return '';
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  const a = new Date(d1);
  const b = new Date(d2);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getAvatarBg = (str) => {
  const colors = [
    { bg: '#E0F2FE', text: '#0284C7' },
    { bg: '#DCFCE7', text: '#15803D' },
    { bg: '#FEF3C7', text: '#B45309' },
    { bg: '#F3E8FF', text: '#7C3AED' },
    { bg: '#FCE7F3', text: '#BE185D' },
    { bg: '#E2E8F0', text: '#475569' },
  ];
  let hash = 0;
  for (let i = 0; i < (str || '').length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getLocationUrl = (loc) => {
  if (!loc) return null;
  if (loc.lat && loc.lng) {
    return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
  }
  if (loc.address) {
    return `https://www.google.com/maps?q=${encodeURIComponent(loc.address)}`;
  }
  return null;
};

const TeamAttendanceRosterView = () => {
  const [viewMode, setViewMode] = useState('day'); // 'day' | 'week' | 'month'
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [search, setSearch] = useState('');

  const [rosterData, setRosterData] = useState({ employees: [], records: [], leaves: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Compute Active Date Range & Label matching Image: Day, Week, Month
  const rangeInfo = useMemo(() => {
    const d = new Date(anchorDate);
    d.setHours(0, 0, 0, 0);

    if (viewMode === 'day') {
      const dateStr = toLocalDateString(d);
      return {
        startDate: dateStr,
        endDate: dateStr,
        date: dateStr,
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
        days: [d],
      };
    }

    if (viewMode === 'week') {
      const dayOfWeek = d.getDay(); // 0 is Sunday
      const monday = new Date(d);
      monday.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const days = [];
      for (let i = 0; i < 7; i++) {
        const item = new Date(monday);
        item.setDate(monday.getDate() + i);
        days.push(item);
      }

      const startMonth = monday.toLocaleDateString('en-US', { month: 'short' });
      const endMonth = sunday.toLocaleDateString('en-US', { month: 'short' });
      const year = sunday.getFullYear();
      const label = `${monday.getDate()} ${startMonth} – ${sunday.getDate()} ${endMonth} ${year}`;

      return {
        startDate: toLocalDateString(monday),
        endDate: toLocalDateString(sunday),
        date: toLocalDateString(d),
        label,
        days,
      };
    }

    if (viewMode === 'month') {
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const days = [];
      for (let i = 1; i <= end.getDate(); i++) {
        days.push(new Date(d.getFullYear(), d.getMonth(), i));
      }
      return {
        startDate: toLocalDateString(start),
        endDate: toLocalDateString(end),
        date: toLocalDateString(d),
        label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        days,
      };
    }

    const todayStr = toLocalDateString(new Date());
    return { startDate: todayStr, endDate: todayStr, date: todayStr, label: 'Today', days: [new Date()] };
  }, [anchorDate, viewMode]);

  // Navigate Previous / Next / Reset
  const handlePrev = () => {
    const d = new Date(anchorDate);
    if (viewMode === 'day') d.setDate(d.getDate() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    setAnchorDate(d);
  };

  const handleNext = () => {
    const d = new Date(anchorDate);
    if (viewMode === 'day') d.setDate(d.getDate() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    setAnchorDate(d);
  };

  const handleToday = () => {
    setAnchorDate(new Date());
  };

  // Fetch Roster Data
  const fetchRoster = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getTeamAttendanceRoster({
        mode: viewMode,
        startDate: rangeInfo.startDate,
        endDate: rangeInfo.endDate,
        date: rangeInfo.startDate,
      });
      if (res && res.success && res.data) {
        setRosterData(res.data);
      }
    } catch (err) {
      console.error('Error fetching team attendance roster:', err);
      setError(err.response?.data?.message || 'Failed to load team attendance roster.');
    } finally {
      setLoading(false);
    }
  }, [viewMode, rangeInfo.startDate, rangeInfo.endDate]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  // Filtered Employees
  const filteredEmployees = useMemo(() => {
    const emps = rosterData.employees || [];
    if (!search.trim()) return emps;

    const q = search.trim().toLowerCase();
    return emps.filter((emp) => {
      return (
        emp.name?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.employeeId?.toLowerCase().includes(q) ||
        emp.designation?.toLowerCase().includes(q) ||
        emp.roleId?.name?.toLowerCase().includes(q) ||
        emp.departmentId?.name?.toLowerCase().includes(q)
      );
    });
  }, [rosterData.employees, search]);

  return (
    <div className="erp-fade-in pb-4">
      {/* ── Top Header Navigation Console (Day | Week | Month + Date Arrows + Today) ── */}
      <div className="card shadow-sm border-0 mb-3 rounded-3 bg-white p-3">
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-3">
          {/* Left Title */}
          <div>
            <div className="d-flex align-items-center gap-2">
              <Users size={20} className="text-primary" />
              <h4 className="fw-bold mb-0 text-dark" style={{ letterSpacing: '-0.02em', fontSize: '1.25rem' }}>
                Team Attendance
              </h4>
            </div>
            <p className="small text-muted mb-0 mt-0.5" style={{ fontSize: '0.8rem' }}>
              Workforce attendance roster, live telemetry clock punches, and periodic records
            </p>
          </div>

          {/* Right Date Filter Controller: [ Day | Week | Month ]  [ <  Date Label  > ]  [ ↺ Today ] */}
          <div className="d-flex flex-wrap align-items-center gap-2 w-100 w-lg-auto justify-content-start justify-content-lg-end">
            {/* View Mode Toggle */}
            <div className="btn-group p-0.5 rounded-3 bg-light border shadow-none" role="group">
              {['day', 'week', 'month'].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`btn btn-sm fw-bold px-3 py-1.5 rounded-2 ${
                    viewMode === m ? 'bg-white shadow-xs text-primary' : 'text-muted border-0'
                  }`}
                  style={{ fontSize: '0.78rem', textTransform: 'capitalize' }}
                  onClick={() => setViewMode(m)}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Date Arrow Navigation */}
            <div className="d-flex align-items-center gap-1.5 bg-white rounded-3 px-2 py-1 border shadow-xs">
              <button
                type="button"
                className="btn btn-sm p-1 rounded-2 text-muted border-0 d-flex align-items-center justify-content-center"
                style={{ width: '28px', height: '28px' }}
                onClick={handlePrev}
                title="Previous"
              >
                <ChevronLeft size={16} />
              </button>

              <span
                className="fw-bold px-2 text-dark font-monospace text-center"
                style={{ fontSize: '0.82rem', minWidth: viewMode === 'week' ? '170px' : '130px' }}
              >
                {rangeInfo.label}
              </span>

              <button
                type="button"
                className="btn btn-sm p-1 rounded-2 text-muted border-0 d-flex align-items-center justify-content-center"
                style={{ width: '28px', height: '28px' }}
                onClick={handleNext}
                title="Next"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Quick Reset Today Button */}
            <button
              type="button"
              className="btn btn-sm btn-outline-primary fw-semibold px-3 py-1.5 rounded-3 shadow-none d-flex align-items-center gap-1.5"
              style={{ fontSize: '0.78rem', height: '36px' }}
              onClick={handleToday}
            >
              <RotateCcw size={13} />
              <span>Today</span>
            </button>
          </div>
        </div>

        {/* ── Quick Search Bar ── */}
        <div className="row g-2 mt-2 pt-2 border-top">
          <div className="col-12 col-md-5">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light border-0 text-muted ps-2.5">
                <Search size={14} />
              </span>
              <input
                type="text"
                className="form-control form-control-sm bg-light border-0 ps-1 text-dark"
                placeholder="Search staff by name, employee ID, role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ fontSize: '0.8rem' }}
              />
              {search && (
                <button
                  type="button"
                  className="btn btn-sm bg-light border-0 text-muted pe-2"
                  onClick={() => setSearch('')}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="alert alert-danger small p-2.5 mb-3 rounded-3 d-flex align-items-center justify-content-between">
          <span>{error}</span>
          <button className="btn-close btn-sm" onClick={() => setError('')} />
        </div>
      )}

      {/* ── Main Viewport Content ── */}
      {loading ? (
        <div className="card shadow-sm border-0 rounded-3 bg-white p-5 text-center">
          <LoadingSpinner text="Synchronizing workforce attendance telemetry..." />
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="card shadow-sm border-0 rounded-3 bg-white p-5 text-center text-muted">
          <Users size={36} className="mx-auto mb-2 opacity-40 text-secondary" />
          <h6 className="fw-bold mb-1 text-dark">No Employees Match Filter</h6>
          <p className="small mb-0">Try clearing your search term or navigating dates.</p>
        </div>
      ) : viewMode === 'week' ? (
        /* ══════════════════════════════════════════════════════════════
           WEEK VIEW: 7-DAY MATRIX (MONDAY TO SUNDAY)
           ══════════════════════════════════════════════════════════════ */
        <div className="card shadow-sm border-0 rounded-3 bg-white overflow-hidden">
          <div className="table-responsive">
            <table className="table align-middle mb-0" style={{ minWidth: '980px', fontSize: '0.82rem' }}>
              <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <tr>
                  <th style={{ width: '260px', padding: '12px 16px', fontWeight: 700, color: '#475569', fontSize: '0.74rem' }}>
                    EMPLOYEE
                  </th>
                  {rangeInfo.days.map((dayDate) => {
                    const isToday = isSameDay(dayDate, new Date());
                    const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                    const dayNum = dayDate.getDate();

                    return (
                      <th
                        key={dayDate.toISOString()}
                        className="text-center"
                        style={{
                          padding: '10px 8px',
                          borderLeft: '1px solid #F1F5F9',
                          backgroundColor: isToday ? '#F0F9FF' : '#F8FAFC',
                          borderTop: isToday ? '3px solid #0284C7' : 'none',
                        }}
                      >
                        <div style={{ fontSize: '0.67rem', color: isToday ? '#0284C7' : '#64748B', letterSpacing: '0.5px' }}>
                          {dayName}
                        </div>
                        <div className="fw-bold" style={{ fontSize: '1rem', color: isToday ? '#0284C7' : '#1E293B', lineHeight: 1.2 }}>
                          {dayNum}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => {
                  const avatarColor = getAvatarBg(emp.name);
                  const initials = getInitials(emp.name);

                  return (
                    <tr key={emp._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <div className="d-flex align-items-center gap-2.5">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                            style={{
                              width: '36px',
                              height: '36px',
                              backgroundColor: avatarColor.bg,
                              color: avatarColor.text,
                              fontSize: '0.8rem',
                            }}
                          >
                            {initials}
                          </div>
                          <div className="overflow-hidden" style={{ lineHeight: 1.25 }}>
                            <div className="fw-bold text-dark text-truncate" style={{ fontSize: '0.86rem' }}>
                              {emp.name}
                            </div>
                            <div className="d-flex align-items-center gap-1 mt-1 text-muted small" style={{ fontSize: '0.72rem' }}>
                              <span>{emp.designation || emp.roleId?.name || 'Staff'}</span>
                              {emp.departmentId?.name && <span>• {emp.departmentId.name}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {rangeInfo.days.map((dayDate) => {
                        const dateStr = toLocalDateString(dayDate);
                        const isSunday = dayDate.getDay() === 0;
                        const isToday = isSameDay(dayDate, new Date());
                        const isFuture = dayDate > new Date() && !isToday;

                        const rec = (rosterData.records || []).find(
                          (r) => (r.userId?._id === emp._id || r.userId === emp._id) && r.date === dateStr
                        );

                        const dayTime = dayDate.getTime();
                        const isLeave = (rosterData.leaves || []).some(
                          (l) =>
                            (l.userId?._id === emp._id || l.userId === emp._id) &&
                            new Date(l.startDate).getTime() <= dayTime &&
                            new Date(l.endDate).getTime() >= dayTime
                        );

                        let content = null;

                        if (rec && rec.punchIn?.time) {
                          const inTime = new Date(rec.punchIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                          const outTime = rec.punchOut?.time
                            ? new Date(rec.punchOut.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                            : '--:--';

                          let durationText = '';
                          if (rec.workingHours > 0) {
                            const hrs = Math.floor(rec.workingHours);
                            const mins = Math.round((rec.workingHours % 1) * 60);
                            durationText = `${hrs}h ${mins}m`;
                          } else if (rec.actualWorkedMinutes > 0) {
                            const hrs = Math.floor(rec.actualWorkedMinutes / 60);
                            const mins = rec.actualWorkedMinutes % 60;
                            durationText = `${hrs}h ${mins}m`;
                          }

                          content = (
                            <div className="d-flex flex-column gap-1 text-center">
                              <div className="d-flex align-items-center justify-content-center gap-1 text-success fw-semibold" style={{ fontSize: '0.73rem' }}>
                                <span>→ {inTime}</span>
                                {rec.punchIn?.location && (
                                  <a href={getLocationUrl(rec.punchIn.location)} target="_blank" rel="noopener noreferrer" className="d-inline-flex align-items-center text-danger">
                                    <MapPin size={11} />
                                  </a>
                                )}
                              </div>
                              <div className="d-flex align-items-center justify-content-center gap-1 text-danger fw-semibold" style={{ fontSize: '0.73rem' }}>
                                <span>← {outTime}</span>
                                {rec.punchOut?.location && (
                                  <a href={getLocationUrl(rec.punchOut.location)} target="_blank" rel="noopener noreferrer" className="d-inline-flex align-items-center text-danger">
                                    <MapPin size={11} />
                                  </a>
                                )}
                              </div>
                              {durationText && (
                                <div className="mt-0.5">
                                  <span className="badge rounded-pill fw-bold bg-success-subtle text-success" style={{ fontSize: '0.67rem', padding: '2px 7px' }}>
                                    {durationText}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        } else if (isLeave) {
                          content = (
                            <span className="badge rounded-pill fw-semibold bg-purple-subtle text-purple" style={{ fontSize: '0.7rem', padding: '3px 8px' }}>
                              Leave
                            </span>
                          );
                        } else if (isSunday) {
                          content = (
                            <span className="badge rounded-pill text-muted bg-light border" style={{ fontSize: '0.7rem', padding: '3px 8px' }}>
                              Off
                            </span>
                          );
                        } else if (isFuture) {
                          content = <span className="text-muted" style={{ fontSize: '0.7rem' }}>—</span>;
                        } else {
                          content = (
                            <span className="badge rounded-pill bg-danger-subtle text-danger" style={{ fontSize: '0.68rem', padding: '3px 7px' }}>
                              Absent
                            </span>
                          );
                        }

                        return (
                          <td
                            key={dateStr}
                            className="text-center"
                            style={{
                              padding: '10px 6px',
                              borderLeft: '1px solid #F1F5F9',
                              backgroundColor: isToday ? '#FAFCFF' : 'transparent',
                              verticalAlign: 'middle',
                            }}
                          >
                            {content}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === 'month' ? (
        /* ══════════════════════════════════════════════════════════════
           MONTH VIEW: SUMMARY TABLE
           ══════════════════════════════════════════════════════════════ */
        <div className="card shadow-sm border-0 rounded-3 bg-white overflow-hidden">
          <div className="table-responsive">
            <table className="table align-middle mb-0" style={{ minWidth: '850px', fontSize: '0.84rem' }}>
              <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <tr>
                  <th style={{ padding: '12px 16px', color: '#475569', fontSize: '0.74rem' }}>STAFF MEMBER</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontSize: '0.74rem' }}>DEPARTMENT</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontSize: '0.74rem' }} className="text-center">PRESENT DAYS</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontSize: '0.74rem' }} className="text-center">ABSENT DAYS</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontSize: '0.74rem' }} className="text-center">LEAVES</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontSize: '0.74rem' }} className="text-center">WORKED HOURS</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => {
                  const avatarColor = getAvatarBg(emp.name);
                  const initials = getInitials(emp.name);

                  const empRecords = (rosterData.records || []).filter(
                    (r) => r.userId?._id === emp._id || r.userId === emp._id
                  );
                  const presentDays = empRecords.filter((r) => r.punchIn?.time).length;
                  const totalWorkedHours = empRecords.reduce((acc, r) => acc + (r.workingHours || 0), 0);

                  return (
                    <tr key={emp._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="d-flex align-items-center gap-2.5">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                            style={{
                              width: '36px',
                              height: '36px',
                              backgroundColor: avatarColor.bg,
                              color: avatarColor.text,
                              fontSize: '0.8rem',
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="fw-bold text-dark">{emp.name}</div>
                            <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                              {emp.employeeId || 'ID: Staff'} • {emp.designation || emp.roleId?.name || 'Staff'}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="text-muted small">{emp.departmentId?.name || 'Operations'}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }} className="text-center">
                        <span className="badge rounded-pill bg-success-subtle text-success fw-bold px-2.5 py-1">
                          {presentDays} Days
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }} className="text-center">
                        <span className="text-muted small">{Math.max(0, rangeInfo.days.length - presentDays)} Days</span>
                      </td>
                      <td style={{ padding: '12px 16px' }} className="text-center">
                        <span className="text-muted small">0</span>
                      </td>
                      <td style={{ padding: '12px 16px' }} className="text-center">
                        <span className="fw-bold text-primary">{totalWorkedHours.toFixed(1)} hrs</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════
           DAY VIEW: DAILY TELEMETRY ROSTER LIST
           (No Shift Column, No Action Column)
           ══════════════════════════════════════════════════════════════ */
        <div className="card shadow-sm border-0 rounded-3 bg-white overflow-hidden">
          <div className="table-responsive">
            <table className="table align-middle mb-0" style={{ minWidth: '750px', fontSize: '0.84rem' }}>
              <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <tr>
                  <th style={{ padding: '12px 16px', color: '#475569', fontSize: '0.74rem' }}>STAFF MEMBER</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontSize: '0.74rem' }}>STATUS</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontSize: '0.74rem' }}>PUNCH IN</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontSize: '0.74rem' }}>PUNCH OUT</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontSize: '0.74rem' }}>DURATION</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => {
                  const avatarColor = getAvatarBg(emp.name);
                  const initials = getInitials(emp.name);
                  const targetDateStr = rangeInfo.startDate;

                  const rec = (rosterData.records || []).find(
                    (r) => (r.userId?._id === emp._id || r.userId === emp._id) && r.date === targetDateStr
                  );

                  const dayTime = new Date(targetDateStr).getTime();
                  const isLeave = (rosterData.leaves || []).some(
                    (l) =>
                      (l.userId?._id === emp._id || l.userId === emp._id) &&
                      new Date(l.startDate).getTime() <= dayTime &&
                      new Date(l.endDate).getTime() >= dayTime
                  );

                  const isSun = new Date(targetDateStr).getDay() === 0;

                  let statusBadge = (
                    <span className="badge rounded-pill px-2.5 py-1 bg-danger-subtle text-danger border border-danger-subtle">
                      Absent
                    </span>
                  );

                  if (rec && rec.punchIn?.time) {
                    statusBadge = (
                      <span className="badge rounded-pill px-2.5 py-1 bg-success-subtle text-success border border-success-subtle">
                        Present
                      </span>
                    );
                  } else if (isLeave) {
                    statusBadge = (
                      <span className="badge rounded-pill px-2.5 py-1 bg-purple-subtle text-purple border">
                        On Leave
                      </span>
                    );
                  } else if (isSun) {
                    statusBadge = (
                      <span className="badge rounded-pill px-2.5 py-1 bg-light text-muted border">
                        Weekly Off
                      </span>
                    );
                  }

                  const inTime = rec?.punchIn?.time
                    ? new Date(rec.punchIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '—';
                  const inLoc = getDisplayAddress(rec?.punchIn?.location);
                  const inLocUrl = getLocationUrl(rec?.punchIn?.location);

                  const outTime = rec?.punchOut?.time
                    ? new Date(rec.punchOut.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : rec?.punchIn?.time ? 'Currently Active' : '—';
                  const outLoc = getDisplayAddress(rec?.punchOut?.location);
                  const outLocUrl = getLocationUrl(rec?.punchOut?.location);

                  const duration = rec?.workingHours
                    ? `${Math.floor(rec.workingHours)}h ${Math.round((rec.workingHours % 1) * 60)}m`
                    : rec?.actualWorkedMinutes
                    ? `${Math.floor(rec.actualWorkedMinutes / 60)}h ${rec.actualWorkedMinutes % 60}m`
                    : '0h 0m';

                  return (
                    <tr key={emp._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="d-flex align-items-center gap-2.5">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                            style={{
                              width: '36px',
                              height: '36px',
                              backgroundColor: avatarColor.bg,
                              color: avatarColor.text,
                              fontSize: '0.8rem',
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="fw-bold text-dark">{emp.name}</div>
                            <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                              {emp.employeeId || 'ID: Staff'} • {emp.designation || emp.roleId?.name || 'Staff'}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>{statusBadge}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="small fw-semibold text-success">{inTime}</div>
                        {rec?.punchIn?.time && (
                          inLocUrl ? (
                            <a
                              href={inLocUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="d-inline-flex align-items-center gap-1 text-decoration-none text-primary mt-0.5"
                              style={{ fontSize: '0.72rem' }}
                              title={`GPS Location: ${inLoc} (Click to open map)`}
                            >
                              <MapPin size={12} className="text-danger flex-shrink-0" />
                              <span className="text-truncate text-secondary" style={{ maxWidth: '130px' }}>
                                {inLoc}
                              </span>
                              <ExternalLink size={10} className="text-muted flex-shrink-0" />
                            </a>
                          ) : (
                            <div className="d-inline-flex align-items-center gap-1 text-muted mt-0.5" style={{ fontSize: '0.72rem' }}>
                              <MapPin size={12} className="opacity-50 flex-shrink-0" />
                              <span className="text-truncate" style={{ maxWidth: '130px' }}>
                                {inLoc}
                              </span>
                            </div>
                          )
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="small fw-semibold text-danger">{outTime}</div>
                        {rec?.punchOut?.time ? (
                          outLocUrl ? (
                            <a
                              href={outLocUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="d-inline-flex align-items-center gap-1 text-decoration-none text-primary mt-0.5"
                              style={{ fontSize: '0.72rem' }}
                              title={`GPS Location: ${outLoc} (Click to open map)`}
                            >
                              <MapPin size={12} className="text-danger flex-shrink-0" />
                              <span className="text-truncate text-secondary" style={{ maxWidth: '130px' }}>
                                {outLoc}
                              </span>
                              <ExternalLink size={10} className="text-muted flex-shrink-0" />
                            </a>
                          ) : (
                            <div className="d-inline-flex align-items-center gap-1 text-muted mt-0.5" style={{ fontSize: '0.72rem' }}>
                              <MapPin size={12} className="opacity-50 flex-shrink-0" />
                              <span className="text-truncate" style={{ maxWidth: '130px' }}>
                                {outLoc}
                              </span>
                            </div>
                          )
                        ) : rec?.punchIn?.time ? (
                          <div className="d-inline-flex align-items-center gap-1 mt-0.5">
                            <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle" style={{ fontSize: '0.67rem' }}>
                              ● On Duty
                            </span>
                          </div>
                        ) : null}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="badge rounded-pill fw-bold bg-light text-dark border">
                          {duration}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamAttendanceRosterView;
