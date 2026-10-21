import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getAllAttendance, getShifts, correctAttendanceRecord } from '../../api/attendanceApi';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useSocket } from '../../components/providers/SocketProvider';
import { exportAttendancePDF, exportAttendanceXLSX, exportAttendanceCSV } from '../../utils/exportUtils';

// ERP Design System Tokens
const THEME = {
  navy: '#0F172A',
  primary: '#1E5385',
  primaryDark: '#164069',
  primaryLight: '#EFF6FF',
  border: '#CBD5E1',
  surface: '#F8FAFC',
  cardBg: '#FFFFFF',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  successBg: '#DCFCE7',
  successText: '#15803D',
  warningBg: '#FEF3C7',
  warningText: '#B45309',
  dangerBg: '#FEE2E2',
  dangerText: '#DC2626',
  purpleBg: '#F5F3FF',
  purpleText: '#7C3AED',
};

const getStatusBadgeStyle = (status) => {
  switch (status) {
    case 'Present':
      return { bg: THEME.successBg, color: THEME.successText, border: '#86EFAC' };
    case 'Half-Day':
      return { bg: THEME.warningBg, color: THEME.warningText, border: '#FDE68A' };
    case 'Absent':
      return { bg: THEME.dangerBg, color: THEME.dangerText, border: '#FECACA' };
    case 'Leave':
      return { bg: THEME.purpleBg, color: THEME.purpleText, border: '#DDD6FE' };
    default:
      return { bg: '#F1F5F9', color: THEME.textSecondary, border: '#CBD5E1' };
  }
};

const AttendanceListPage = ({ hideHeader = false, dateRangeFilter = {} }) => {
  const socket = useSocket();
  const [records, setRecords] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [date, setDate] = useState('');

  // Employee Dropdown Controller
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const employeeDropdownRef = useRef(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Admin Correction Modal
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editPunchIn, setEditPunchIn] = useState('');
  const [editPunchOut, setEditPunchOut] = useState('');
  const [editStatus, setEditStatus] = useState('Present');
  const [editReason, setEditReason] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  // Load shifts for filter
  useEffect(() => {
    getShifts()
      .then((res) => {
        if (res.success) setShifts(res.data);
      })
      .catch(() => {});
  }, []);

  // Click outside listener to dismiss employee dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(e.target)) {
        setShowEmployeeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit: 15,
        status: status || undefined,
        shiftId: shiftId || undefined,
        search: search || undefined,
      };

      if (dateRangeFilter.startDate && dateRangeFilter.endDate) {
        params.startDate = dateRangeFilter.startDate;
        params.endDate = dateRangeFilter.endDate;
      } else if (date) {
        params.date = date;
      }

      const res = await getAllAttendance(params);
      if (res && res.success) {
        setRecords(res.data.records || []);
        setPagination({
          page: res.data.pagination.page,
          totalPages: res.data.pagination.pages,
          total: res.data.pagination.total,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch attendance records.');
    } finally {
      setLoading(false);
    }
  }, [page, date, status, shiftId, search, dateRangeFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Real-time socket sync
  useEffect(() => {
    if (!socket) return;

    const handleAttendanceUpdated = (updatedRecord) => {
      setRecords((prev) => {
        const index = prev.findIndex((r) => r._id === updatedRecord._id);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = updatedRecord;
          return updated;
        }
        return [updatedRecord, ...prev];
      });
    };

    socket.on('attendance_updated', handleAttendanceUpdated);
    return () => socket.off('attendance_updated', handleAttendanceUpdated);
  }, [socket]);

  // Extract distinct employee list for dropdown suggestions
  const employeeDirectory = useMemo(() => {
    const empMap = new Map();
    records.forEach((r) => {
      if (r.userId && r.userId._id && !empMap.has(r.userId._id)) {
        empMap.set(r.userId._id, {
          id: r.userId._id,
          name: r.userId.name || 'Employee',
          employeeId: r.userId.employeeId || '',
          email: r.userId.email || '',
          dept: r.departmentId?.name || 'General',
        });
      }
    });
    return Array.from(empMap.values());
  }, [records]);

  // Filtered dropdown suggestions based on user keystrokes
  const dropdownEmployeeSuggestions = useMemo(() => {
    if (!search || search.trim() === '') return employeeDirectory;
    const q = search.toLowerCase();
    return employeeDirectory.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.employeeId?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q)
    );
  }, [employeeDirectory, search]);

  const handleSelectEmployee = (emp) => {
    setSearch(emp.name);
    setShowEmployeeDropdown(false);
    setPage(1);
  };

  // Exports
  const handleExportPDF = () => {
    exportAttendancePDF({
      title: 'Company Attendance Report',
      dateRange: dateRangeFilter.startDate ? `${dateRangeFilter.startDate} to ${dateRangeFilter.endDate}` : (date || 'All Dates'),
      records,
      filtersApplied: { Status: status, Shift: shiftId, Search: search },
    });
  };

  const handleExportXLSX = () => {
    exportAttendanceXLSX({
      title: 'Company_Attendance_Export',
      records,
    });
  };

  const handleExportCSV = () => {
    exportAttendanceCSV({
      title: 'company_attendance_report',
      records,
    });
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setShiftId('');
    setDate('');
    setPage(1);
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
      alert('A valid reason is required for attendance adjustments.');
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
        setSelectedRecord(null);
        fetchRecords();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Correction failed.');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  const hasActiveFilters = Boolean(search || status || shiftId || date);

  return (
    <div style={{ backgroundColor: THEME.surface, minHeight: '100%', padding: '4px 0' }}>
      
      <style>{`
        @import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css");

        .employee-dropdown-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: #FFFFFF;
          border: 1px solid #CBD5E1;
          border-radius: 8px;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
          z-index: 1050;
          max-height: 280px;
          overflow-y: auto;
        }

        .dropdown-item-hover {
          padding: 10px 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #F1F5F9;
          transition: background-color 0.15s ease;
        }
        .dropdown-item-hover:hover {
          background-color: #F8FAFC;
        }
        .dropdown-item-hover:last-child {
          border-bottom: none;
        }

        .form-control-custom, .form-select-custom {
          border-radius: 8px;
          border: 1px solid #CBD5E1;
          font-size: 0.86rem;
          height: 38px;
        }
        .form-control-custom:focus, .form-select-custom:focus {
          border-color: #0284C7 !important;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15) !important;
          outline: none;
        }
      `}</style>

      {/* ── Header Section ── */}
      {!hideHeader && (
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center pb-3 mb-3 border-bottom" style={{ borderColor: THEME.border }}>
          <div>
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-person-badge-fill text-primary fs-5"></i>
              <h4 className="fw-bold mb-0" style={{ color: THEME.navy, letterSpacing: '-0.02em', fontSize: '1.25rem' }}>
                Employee Attendance Log
              </h4>
            </div>
            <p className="small text-muted mb-0 mt-1">
              Live biometric logs, active time cards, shifts, and duration auditing.
            </p>
          </div>
          <div className="mt-2 mt-sm-0">
            <span
              className="badge px-2.5 py-1.5 rounded-pill"
              style={{
                backgroundColor: '#EFF6FF',
                color: THEME.primary,
                border: '1px solid #BFDBFE',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Total Records: {pagination.total || records.length}
            </span>
          </div>
        </div>
      )}

      {/* ── Filter and Action Console Bar (Dropdown + Search First) ── */}
      <div
        className="rounded-3 p-3 mb-3 shadow-sm bg-white"
        style={{
          border: `1px solid ${THEME.border}`,
        }}
      >
        <div className="row g-2 align-items-center">
          
          {/* 1. FIRST ITEM: Search & Employee Selection Dropdown */}
          <div className="col-12 col-md-4 col-lg-3" ref={employeeDropdownRef}>
            <div className="position-relative">
              <div className="input-group">
                <span
                  className="input-group-text bg-white border-end-0 text-muted ps-2.5 pe-2"
                  style={{ borderColor: THEME.border }}
                >
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control form-control-custom border-start-0 border-end-0 ps-1"
                  placeholder={search ? search : `Select Employee (${employeeDirectory.length})...`}
                  value={search}
                  onFocus={() => setShowEmployeeDropdown(true)}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setShowEmployeeDropdown(true);
                    setPage(1);
                  }}
                />
                {search ? (
                  <button
                    className="btn btn-outline-secondary border-start-0 bg-white border-top border-bottom border-end px-2"
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setShowEmployeeDropdown(false);
                      setPage(1);
                    }}
                  >
                    <i className="bi bi-x-circle-fill text-muted"></i>
                  </button>
                ) : (
                  <span
                    className="input-group-text bg-white border-start-0 text-muted px-2.5"
                    style={{ cursor: 'pointer', borderColor: THEME.border }}
                    onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
                  >
                    <i className="bi bi-chevron-down small"></i>
                  </span>
                )}
              </div>

              {/* Autocomplete Employee Dropdown Menu */}
              {showEmployeeDropdown && (
                <div className="employee-dropdown-menu shadow">
                  <div
                    className="dropdown-item-hover fw-semibold text-primary border-bottom"
                    onClick={() => {
                      setSearch('');
                      setShowEmployeeDropdown(false);
                      setPage(1);
                    }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-people-fill"></i>
                      <span>All Employees ({employeeDirectory.length})</span>
                    </div>
                  </div>

                  {dropdownEmployeeSuggestions.length > 0 ? (
                    dropdownEmployeeSuggestions.map((emp) => (
                      <div
                        key={emp.id}
                        className="dropdown-item-hover"
                        onClick={() => handleSelectEmployee(emp)}
                      >
                        <div className="text-truncate pe-2">
                          <div className="fw-semibold text-dark small text-truncate">{emp.name}</div>
                          <div className="text-muted small text-truncate" style={{ fontSize: '0.74rem' }}>
                            {emp.dept} {emp.employeeId ? `• ID: ${emp.employeeId}` : ''}
                          </div>
                        </div>
                        <span className="badge bg-light text-dark border small flex-shrink-0">
                          Select
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-muted small">
                      No employees match "{search}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. Status Dropdown */}
          <div className="col-6 col-md-4 col-lg-2">
            <select
              className="form-select form-select-custom"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Half-Day">Half-Day</option>
              <option value="Absent">Absent</option>
              <option value="Leave">Leave</option>
            </select>
          </div>

          {/* 3. Shift Dropdown */}
          <div className="col-6 col-md-4 col-lg-2">
            <select
              className="form-select form-select-custom"
              value={shiftId}
              onChange={(e) => {
                setShiftId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Shifts</option>
              {shifts.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* 4. Date Picker */}
          <div className="col-6 col-md-4 col-lg-2">
            <input
              type="date"
              className="form-control form-control-custom"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPage(1);
              }}
              disabled={Boolean(dateRangeFilter.startDate)}
            />
          </div>

          {/* 5. Export Controls & Clear Button */}
          <div className="col-6 col-md-8 col-lg-3 d-flex justify-content-end align-items-center gap-1.5">
            {hasActiveFilters && (
              <button
                className="btn btn-sm btn-light border text-danger d-inline-flex align-items-center gap-1"
                onClick={handleClearFilters}
                title="Reset Filters"
                style={{ fontSize: '12px', height: '36px', padding: '0 10px' }}
              >
                <i className="bi bi-arrow-counterclockwise"></i>
                <span className="d-none d-sm-inline">Reset</span>
              </button>
            )}
            <div className="btn-group btn-group-sm" role="group">
              <button
                className="btn btn-outline-secondary d-inline-flex align-items-center gap-1"
                onClick={handleExportPDF}
                title="Export PDF"
                style={{ height: '36px', borderColor: THEME.border }}
              >
                <i className="bi bi-file-earmark-pdf"></i>
                <span className="d-none d-sm-inline">PDF</span>
              </button>
              <button
                className="btn btn-outline-secondary d-inline-flex align-items-center gap-1"
                onClick={handleExportXLSX}
                title="Export Excel"
                style={{ height: '36px', borderColor: THEME.border }}
              >
                <i className="bi bi-file-earmark-excel"></i>
                <span className="d-none d-sm-inline">Excel</span>
              </button>
              <button
                className="btn btn-outline-secondary d-inline-flex align-items-center gap-1"
                onClick={handleExportCSV}
                title="Export CSV"
                style={{ height: '36px', borderColor: THEME.border }}
              >
                <i className="bi bi-filetype-csv"></i>
                <span className="d-none d-sm-inline">CSV</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {error && (
        <div
          className="alert alert-danger small p-2.5 mb-3 d-flex align-items-center justify-content-between rounded-3"
          role="alert"
        >
          <span><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</span>
          <button className="btn-close btn-sm" onClick={() => setError('')}></button>
        </div>
      )}

      {/* ── Main Content: Table & Mobile Cards ── */}
      <div
        className="rounded-3 shadow-sm overflow-hidden bg-white"
        style={{
          border: `1px solid ${THEME.border}`,
        }}
      >
        {loading ? (
          <div className="text-center py-5">
            <LoadingSpinner text="LOADING" subtext="Synchronizing attendance records..." />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-5 px-3">
            <i className="bi bi-calendar-x fs-1 text-muted d-block mb-2"></i>
            <h6 className="fw-bold" style={{ color: THEME.navy }}>
              No Records Found
            </h6>
            <p className="text-muted small mb-3">
              No employee attendance entries match your active filter parameters.
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="btn btn-sm btn-primary"
                style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* DESKTOP VIEW: Table (visible on md+) */}
            <div className="table-responsive d-none d-md-block">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '13px' }}>
                <thead style={{ backgroundColor: '#0F172A', color: '#FFFFFF' }}>
                  <tr>
                    <th style={{ padding: '12px 14px' }}>Date</th>
                    <th>Employee</th>
                    <th>Shift / Dept</th>
                    <th>Punch In</th>
                    <th>Punch Out</th>
                    <th>Work Hours</th>
                    <th>Lateness</th>
                    <th>Overtime</th>
                    <th>Status</th>
                    <th className="text-end pe-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    const statusBadge = getStatusBadgeStyle(r.status);
                    return (
                      <tr key={r._id} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                        <td className="fw-semibold text-nowrap" style={{ padding: '12px 14px', color: THEME.navy }}>
                          {r.date}
                        </td>

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

                        <td>
                          <div style={{ lineHeight: 1.2 }}>
                            <span className="badge bg-light text-dark border px-1.5 py-0.5" style={{ fontSize: '10px' }}>
                              {r.shiftId?.code || 'GEN'}
                            </span>
                            <div className="text-muted text-truncate mt-1" style={{ fontSize: '11px', maxWidth: '110px' }}>
                              {r.departmentId?.name || 'General'}
                            </div>
                          </div>
                        </td>

                        <td className="text-nowrap">
                          {r.punchIn?.time ? (
                            <span className="fw-medium" style={{ color: THEME.navy }}>
                              {new Date(r.punchIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>

                        <td className="text-nowrap">
                          {r.punchOut?.time ? (
                            <span className="fw-medium" style={{ color: THEME.navy }}>
                              {new Date(r.punchOut.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : (
                            <span
                              className="badge text-danger"
                              style={{ backgroundColor: '#FEF2F2', fontSize: '10px', border: '1px solid #FECACA' }}
                            >
                              Missing
                            </span>
                          )}
                        </td>

                        <td>
                          <span className="fw-bold" style={{ color: THEME.primary }}>
                            {r.workingHours ? `${r.workingHours} hrs` : '0 hrs'}
                          </span>
                        </td>

                        <td>
                          {r.lateMinutes > 0 ? (
                            <span
                              className="badge"
                              style={{
                                backgroundColor: THEME.warningBg,
                                color: THEME.warningText,
                                border: '1px solid #FDE68A',
                                fontSize: '11px',
                              }}
                            >
                              +{r.lateMinutes}m late
                            </span>
                          ) : (
                            <span className="text-muted" style={{ fontSize: '12px' }}>On-Time</span>
                          )}
                        </td>

                        <td>
                          <span
                            className="fw-semibold"
                            style={{
                              color: r.overtimeMinutes > 0 ? THEME.successText : THEME.textSecondary,
                              fontSize: '12px',
                            }}
                          >
                            {r.overtimeMinutes ? `${(r.overtimeMinutes / 60).toFixed(1)}h` : '0h'}
                          </span>
                        </td>

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
                            {r.status || 'Present'}
                          </span>
                        </td>

                        <td className="text-end pe-3">
                          <button
                            className="btn btn-sm btn-light border py-1 px-2.5 d-inline-flex align-items-center gap-1"
                            style={{ fontSize: '12px', borderColor: THEME.border }}
                            onClick={() => handleOpenEdit(r)}
                            title="Audit / Correct Record"
                          >
                            <i className="bi bi-pencil"></i>
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE VIEW: Touch-friendly Card List (< 768px) */}
            <div className="d-block d-md-none p-2.5">
              {records.map((r) => {
                const statusBadge = getStatusBadgeStyle(r.status);
                return (
                  <div
                    key={r._id}
                    className="p-3 mb-2.5 rounded-3 bg-white"
                    style={{
                      border: `1px solid ${THEME.border}`,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <div className="fw-bold" style={{ color: THEME.navy, fontSize: '14px' }}>
                          {r.userId?.name || 'Employee'}
                        </div>
                        <div className="text-muted small">
                          {r.date} • {r.shiftId?.code || 'Shift'}
                        </div>
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
                        {r.status || 'Present'}
                      </span>
                    </div>

                    <div
                      className="p-2 rounded-2 mb-2 d-flex justify-content-between"
                      style={{ backgroundColor: THEME.surface, fontSize: '12px' }}
                    >
                      <div>
                        <div className="text-muted" style={{ fontSize: '10px' }}>IN</div>
                        <div className="fw-semibold">
                          {r.punchIn?.time
                            ? new Date(r.punchIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted" style={{ fontSize: '10px' }}>OUT</div>
                        <div className="fw-semibold">
                          {r.punchOut?.time ? (
                            new Date(r.punchOut.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          ) : (
                            <span className="text-danger">Missing</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted" style={{ fontSize: '10px' }}>TOTAL</div>
                        <div className="fw-bold" style={{ color: THEME.primary }}>
                          {r.workingHours ? `${r.workingHours}h` : '0h'}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted" style={{ fontSize: '10px' }}>OVERTIME</div>
                        <div className="fw-semibold" style={{ color: THEME.successText }}>
                          {r.overtimeMinutes ? `${(r.overtimeMinutes / 60).toFixed(1)}h` : '0h'}
                        </div>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center pt-1 border-top">
                      <div>
                        {r.lateMinutes > 0 ? (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: THEME.warningBg,
                              color: THEME.warningText,
                              fontSize: '11px',
                            }}
                          >
                            +{r.lateMinutes} mins late
                          </span>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '11px' }}>✓ On Time</span>
                        )}
                      </div>
                      <button
                        className="btn btn-sm btn-outline-primary py-1 px-3 d-inline-flex align-items-center gap-1"
                        style={{ fontSize: '12px', borderRadius: '6px' }}
                        onClick={() => handleOpenEdit(r)}
                      >
                        <i className="bi bi-pencil"></i>
                        <span>Adjust Record</span>
                      </button>
                    </div>
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
                  Showing page <b>{pagination.page}</b> of <b>{pagination.totalPages}</b> ({pagination.total} entries)
                </span>
                <div>
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={setPage}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Admin Correction Modal with Blurred Backdrop ── */}
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
            className="rounded-3 shadow-lg p-4 bg-white"
            style={{
              width: '100%',
              maxWidth: '480px',
              border: `1px solid ${THEME.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom" style={{ borderColor: THEME.border }}>
              <div>
                <h6 className="fw-bold mb-0" style={{ color: THEME.navy }}>
                  Administrative Correction
                </h6>
                <small className="text-muted">
                  {selectedRecord.userId?.name} • {selectedRecord.date}
                </small>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setSelectedRecord(null)}
              ></button>
            </div>

            <form onSubmit={handleSaveCorrection}>
              <div className="mb-3">
                <label className="form-label small fw-semibold" style={{ color: THEME.textPrimary }}>
                  Punch In Timestamp
                </label>
                <input
                  type="datetime-local"
                  className="form-control form-control-sm form-control-custom"
                  value={editPunchIn}
                  onChange={(e) => setEditPunchIn(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold" style={{ color: THEME.textPrimary }}>
                  Punch Out Timestamp
                </label>
                <input
                  type="datetime-local"
                  className="form-control form-control-sm form-control-custom"
                  value={editPunchOut}
                  onChange={(e) => setEditPunchOut(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold" style={{ color: THEME.textPrimary }}>
                  Attendance Status
                </label>
                <select
                  className="form-select form-select-sm form-select-custom"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="Present">Present</option>
                  <option value="Half-Day">Half-Day</option>
                  <option value="Absent">Absent</option>
                  <option value="Leave">Leave</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-semibold" style={{ color: THEME.textPrimary }}>
                  Audit Justification Reason <span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control form-control-sm"
                  rows="3"
                  placeholder="Provide explanation (e.g. scanner network timeout, manager approval)..."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  style={{ borderColor: THEME.border, borderRadius: '8px' }}
                  required
                ></textarea>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-light border px-3"
                  onClick={() => setSelectedRecord(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm text-white px-3"
                  style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                  disabled={submittingCorrection}
                >
                  {submittingCorrection ? 'Applying Update...' : 'Confirm Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceListPage;