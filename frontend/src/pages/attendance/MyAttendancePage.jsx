import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  punchIn,
  punchOut,
  getMyToday,
  getMyAttendanceHistory,
  requestCorrection,
  requestOvertime,
} from '../../api/attendanceApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useSocket } from '../../components/providers/SocketProvider';
import { useAuth } from '../../hooks/useAuth';
import AttendanceCalendarView from './components/AttendanceCalendarView';
import { exportAttendancePDF, exportAttendanceCSV } from '../../utils/exportUtils';
import Pagination from '../../components/common/Pagination';

// ERP Design System Tokens
const THEME = {
  navy: '#0F172A',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#EFF6FF',
  border: '#E2E8F0',
  surface: '#F8FAFC',
  cardBg: '#FFFFFF',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  successBg: '#ECFDF5',
  successText: '#059669',
  warningBg: '#FFFBEB',
  warningText: '#D97706',
  dangerBg: '#FEF2F2',
  dangerText: '#DC2626',
};

const getStatusBadgeStyle = (status) => {
  switch (status) {
    case 'Present':
      return { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' };
    case 'Half-Day':
      return { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' };
    case 'Absent':
      return { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' };
    case 'Leave':
      return { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' };
    default:
      return { bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1' };
  }
};

const MyAttendancePage = ({ hideHeader = false }) => {
  const socket = useSocket();
  const { user } = useAuth();

  // State
  const [todayData, setTodayData] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Pagination for personal history
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Live Timers
  const [currentTime, setCurrentTime] = useState(new Date());
  const [liveElapsedSeconds, setLiveElapsedSeconds] = useState(0);

  // Modals
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    correctionType: 'MISSED_PUNCH_OUT',
    requestedPunchIn: '',
    requestedPunchOut: '',
    reason: '',
  });

  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [overtimeForm, setOvertimeForm] = useState({
    attendanceId: '',
    requestedMinutes: 60,
    reason: '',
  });

  // Real-time clock ticker
  useEffect(() => {
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Fetch today's status & shift
  const fetchTodayStatus = useCallback(async () => {
    try {
      const res = await getMyToday();
      if (res && res.success) {
        setTodayData(res.data);
      }
    } catch (err) {
      console.error('Error fetching today attendance:', err);
    }
  }, []);

  // Fetch personal history
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyAttendanceHistory({ page, limit: 10 });
      if (res && res.success) {
        setRecords(res.data.records || []);
        setPagination({
          page: res.data.pagination.page,
          totalPages: res.data.pagination.pages,
          total: res.data.pagination.total,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch personal attendance history.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchTodayStatus();
    fetchHistory();
  }, [fetchTodayStatus, fetchHistory]);

  const todaysAttendance = todayData?.attendance;
  const isPunchedIn = Boolean(todaysAttendance?.punchIn?.time && !todaysAttendance?.punchOut?.time);
  const isPunchedOut = Boolean(todaysAttendance?.punchOut?.time);

  // Live timer effect when currently punched in
  useEffect(() => {
    let timer;
    if (isPunchedIn && todaysAttendance?.punchIn?.time) {
      const startTime = new Date(todaysAttendance.punchIn.time).getTime();
      const updateTimer = () => {
        const diff = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
        setLiveElapsedSeconds(diff);
      };
      updateTimer();
      timer = setInterval(updateTimer, 1000);
    } else {
      setLiveElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isPunchedIn, todaysAttendance]);

  // Socket listener for real-time updates
  useEffect(() => {
    if (!socket || !user) return;

    const handleUpdate = (updatedRecord) => {
      const targetUserId = updatedRecord.userId?._id || updatedRecord.userId;
      if (targetUserId === user._id) {
        fetchTodayStatus();
        fetchHistory();
      }
    };

    socket.on('attendance_updated', handleUpdate);
    return () => socket.off('attendance_updated', handleUpdate);
  }, [socket, user, fetchTodayStatus, fetchHistory]);

  // Voice Announcement helper
  const announceAction = (userName, type) => {
    if ('speechSynthesis' in window) {
      const text = type === 'in' ? `${userName}, Punch in successful.` : `${userName}, Punch out successful.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Browser Geolocation
  const getCoordinates = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        return resolve({ lat: 17.385, lng: 78.4867, address: 'Office Terminal' });
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            address: 'Verified Geolocation',
          });
        },
        () => {
          resolve({ lat: 17.385, lng: 78.4867, address: 'Office Terminal' });
        },
        { timeout: 5000 }
      );
    });
  };

  const handlePunchIn = async () => {
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const location = await getCoordinates();
      const res = await punchIn(location);
      if (res && res.success) {
        setSuccessMsg(res.message || 'Punched in successfully.');
        announceAction(user?.name || 'Employee', 'in');
        fetchTodayStatus();
        fetchHistory();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to punch in.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePunchOut = async () => {
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const location = await getCoordinates();
      const res = await punchOut(location);
      if (res && res.success) {
        setSuccessMsg(res.message || 'Punched out successfully.');
        announceAction(user?.name || 'Employee', 'out');
        fetchTodayStatus();
        fetchHistory();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to punch out.');
    } finally {
      setActionLoading(false);
    }
  };

  // Format Elapsed Seconds to HH:MM:SS
  const formatTimer = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Countdown to shift end
  const shiftCountdown = useMemo(() => {
    if (!todayData?.shift?.endTime) return null;
    const [endH, endM] = todayData.shift.endTime.split(':').map(Number);
    const endTarget = new Date();
    endTarget.setHours(endH, endM, 0, 0);

    const diffMs = endTarget - currentTime;
    if (diffMs <= 0) return 'Shift ended';
    const totalMins = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMins / 60);
    const minutes = totalMins % 60;
    return `${hours}h ${minutes}m remaining`;
  }, [todayData, currentTime]);

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await requestCorrection(correctionForm);
      if (res && res.success) {
        alert('Correction request submitted for approval.');
        setShowCorrectionModal(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Submission failed.');
    }
  };

  const handleOvertimeSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await requestOvertime(overtimeForm);
      if (res && res.success) {
        alert('Overtime request submitted for approval.');
        setShowOvertimeModal(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Submission failed.');
    }
  };

  return (
    <div style={{ backgroundColor: THEME.surface, minHeight: '100%' }}>
      {!hideHeader && (
        <div className="pb-3 mb-4 border-bottom" style={{ borderColor: THEME.border }}>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span style={{ fontSize: '1.25rem' }}>⏱️</span>
            <h4 className="fw-bold mb-0" style={{ color: THEME.navy, letterSpacing: '-0.02em' }}>
              My Attendance & Punch Terminal
            </h4>
          </div>
          <p className="text-secondary small mb-0">
            Real-time biometric punch tracking, live shift timers, and monthly attendance calendar.
          </p>
        </div>
      )}

      {/* Alert Notifications */}
      {successMsg && (
        <div
          className="alert alert-success d-flex align-items-center justify-content-between small p-3 mb-3 rounded-3 shadow-sm"
          style={{ backgroundColor: THEME.successBg, color: THEME.successText, border: '1px solid #A7F3D0' }}
        >
          <div className="d-flex align-items-center gap-2">
            <span>✅</span>
            <span className="fw-semibold">{successMsg}</span>
          </div>
          <button className="btn-close btn-sm" onClick={() => setSuccessMsg('')}></button>
        </div>
      )}

      {error && (
        <div
          className="alert alert-danger d-flex align-items-center justify-content-between small p-3 mb-3 rounded-3 shadow-sm"
          style={{ backgroundColor: THEME.dangerBg, color: THEME.dangerText, border: '1px solid #FECACA' }}
        >
          <div className="d-flex align-items-center gap-2">
            <span>⚠️</span>
            <span className="fw-semibold">{error}</span>
          </div>
          <button className="btn-close btn-sm" onClick={() => setError('')}></button>
        </div>
      )}

      {/* Top Section: Punch Terminal & Redesigned Shift Schedule */}
      <div className="row g-3 mb-4">
        
        {/* Terminal Card */}
        <div className="col-12 col-lg-7">
          <div
            className="p-3 p-md-4 rounded-3 shadow-sm h-100 d-flex flex-column justify-content-between"
            style={{
              backgroundColor: THEME.cardBg,
              border: `1px solid ${THEME.border}`,
            }}
          >
            {/* Header & Status */}
            <div>
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                <div>
                  <span
                    className="badge mb-2 d-inline-flex align-items-center gap-1"
                    style={{
                      backgroundColor: THEME.primaryLight,
                      color: THEME.primary,
                      border: '1px solid #BFDBFE',
                      fontSize: '11px',
                    }}
                  >
                    📍 Terminal Active (Geo-Locked)
                  </span>
                  <div
                    className="fw-bold mb-0"
                    style={{
                      color: THEME.navy,
                      fontSize: 'calc(1.4rem + 0.6vw)',
                      letterSpacing: '-0.03em',
                      fontFamily: 'monospace',
                    }}
                  >
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                  <small className="text-secondary fw-medium">
                    {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </small>
                </div>

                <div>
                  {isPunchedIn ? (
                    <span
                      className="badge px-3 py-2 rounded-pill d-inline-flex align-items-center gap-1.5"
                      style={{
                        backgroundColor: THEME.successBg,
                        color: THEME.successText,
                        border: '1px solid #A7F3D0',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      <span
                        className="spinner-grow spinner-grow-sm text-success"
                        style={{ width: '8px', height: '8px' }}
                      ></span>
                      Currently Working
                    </span>
                  ) : isPunchedOut ? (
                    <span
                      className="badge px-3 py-2 rounded-pill"
                      style={{
                        backgroundColor: '#F1F5F9',
                        color: THEME.navy,
                        border: '1px solid #CBD5E1',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      ✓ Punched Out Today
                    </span>
                  ) : (
                    <span
                      className="badge px-3 py-2 rounded-pill"
                      style={{
                        backgroundColor: THEME.warningBg,
                        color: THEME.warningText,
                        border: '1px solid #FDE68A',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      ⏸️ Not Punched In
                    </span>
                  )}
                </div>
              </div>

              {/* Digital Timer Display */}
              <div
                className="p-3 rounded-3 mb-3 text-center"
                style={{
                  backgroundColor: THEME.surface,
                  border: `1px solid ${THEME.border}`,
                }}
              >
                <div
                  className="text-uppercase fw-bold text-secondary mb-1"
                  style={{ fontSize: '11px', letterSpacing: '0.08em' }}
                >
                  Active Shift Counter
                </div>
                <div
                  className="fw-bold my-1"
                  style={{
                    color: isPunchedIn ? THEME.primary : THEME.navy,
                    fontSize: 'calc(1.8rem + 1vw)',
                    fontFamily: 'monospace',
                    letterSpacing: '2px',
                  }}
                >
                  {isPunchedIn
                    ? formatTimer(liveElapsedSeconds)
                    : todaysAttendance?.workingHours
                    ? `${todaysAttendance.workingHours} hrs`
                    : '00:00:00'}
                </div>
                <div className="text-secondary small mt-1">
                  {isPunchedIn
                    ? `Shift Countdown: ${shiftCountdown || 'Calculating...'}`
                    : todaysAttendance?.punchOut?.time
                    ? `Session ended at ${new Date(todaysAttendance.punchOut.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Ready for check-in. Tap "Punch In" below.'}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="row g-2 pt-2">
              <div className="col-6">
                <button
                  className="btn w-100 py-3 fw-bold d-flex flex-column align-items-center justify-content-center shadow-sm"
                  style={{
                    backgroundColor: THEME.primary,
                    borderColor: THEME.primary,
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    fontSize: '15px',
                    opacity: actionLoading || isPunchedIn || isPunchedOut ? 0.6 : 1,
                  }}
                  onClick={handlePunchIn}
                  disabled={actionLoading || isPunchedIn || isPunchedOut}
                >
                  <span style={{ fontSize: '1.25rem', marginBottom: '2px' }}>📥</span>
                  <span>{actionLoading && !isPunchedIn ? 'Recording...' : 'PUNCH IN'}</span>
                </button>
              </div>

              <div className="col-6">
                <button
                  className="btn w-100 py-3 fw-bold d-flex flex-column align-items-center justify-content-center shadow-sm"
                  style={{
                    backgroundColor: isPunchedIn ? '#DC2626' : '#64748B',
                    borderColor: isPunchedIn ? '#DC2626' : '#64748B',
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    fontSize: '15px',
                    opacity: actionLoading || !isPunchedIn ? 0.6 : 1,
                  }}
                  onClick={handlePunchOut}
                  disabled={actionLoading || !isPunchedIn}
                >
                  <span style={{ fontSize: '1.25rem', marginBottom: '2px' }}>📤</span>
                  <span>{actionLoading && isPunchedIn ? 'Recording...' : 'PUNCH OUT'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* REDESIGNED: Assigned Operational Timetable & Shift Rules Card */}
        <div className="col-12 col-lg-5">
          <div
            className="p-3 p-md-4 rounded-3 shadow-sm h-100 d-flex flex-column justify-content-between"
            style={{
              backgroundColor: THEME.cardBg,
              border: `1px solid ${THEME.border}`,
            }}
          >
            <div>
              {/* Card Header */}
              <div
                className="d-flex justify-content-between align-items-start mb-3 pb-2 border-bottom"
                style={{ borderColor: THEME.border }}
              >
                <div className="d-flex align-items-center gap-2">
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: THEME.primaryLight,
                      color: THEME.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      flexShrink: 0,
                    }}
                  >
                    🕒
                  </div>
                  <div>
                    <h6 className="fw-bold mb-0" style={{ color: THEME.navy }}>
                      Shift Schedule & Rules
                    </h6>
                    <small className="text-secondary" style={{ fontSize: '11px' }}>
                      Assigned operational timetable
                    </small>
                  </div>
                </div>

                <span
                  className="badge px-2.5 py-1 rounded-pill fw-bold"
                  style={{
                    backgroundColor: '#EFF6FF',
                    color: THEME.primary,
                    border: '1px solid #BFDBFE',
                    fontSize: '11px',
                  }}
                >
                  {todayData?.shift?.code || 'GEN'}
                </span>
              </div>

              {/* Shift Operating Window Ribbon */}
              <div
                className="p-3 rounded-3 mb-3"
                style={{
                  backgroundColor: '#F8FAFC',
                  border: `1px solid ${THEME.border}`,
                  position: 'relative',
                }}
              >
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold" style={{ color: THEME.navy, fontSize: '13px' }}>
                    {todayData?.shift?.name || 'General Day Shift'}
                  </span>
                  <span
                    className="badge rounded-pill"
                    style={{
                      backgroundColor: '#ECFDF5',
                      color: '#065F46',
                      border: '1px solid #A7F3D0',
                      fontSize: '10px',
                      fontWeight: 600,
                    }}
                  >
                    Active Policy
                  </span>
                </div>

                {/* Timetable Flow Bar */}
                <div
                  className="d-flex align-items-center justify-content-between px-2 py-2 rounded-2"
                  style={{ backgroundColor: '#FFFFFF', border: `1px solid ${THEME.border}` }}
                >
                  <div className="text-center">
                    <span className="text-muted d-block" style={{ fontSize: '10px', fontWeight: 600 }}>
                      START TIME
                    </span>
                    <strong style={{ color: THEME.navy, fontSize: '14px', fontFamily: 'monospace' }}>
                      {todayData?.shift?.startTime || '09:00'}
                    </strong>
                  </div>

                  <div className="d-flex flex-column align-items-center px-2 flex-grow-1">
                    <span
                      className="badge rounded-pill bg-light text-secondary border px-2 py-0.5"
                      style={{ fontSize: '10px', fontWeight: 600 }}
                    >
                      {todayData?.shift?.requiredHours || 8}h Shift
                    </span>
                    <div
                      style={{
                        width: '100%',
                        height: '2px',
                        backgroundColor: '#CBD5E1',
                        margin: '4px 0',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: THEME.primary,
                          position: 'absolute',
                          top: '-2px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                        }}
                      />
                    </div>
                  </div>

                  <div className="text-center">
                    <span className="text-muted d-block" style={{ fontSize: '10px', fontWeight: 600 }}>
                      END TIME
                    </span>
                    <strong style={{ color: THEME.navy, fontSize: '14px', fontFamily: 'monospace' }}>
                      {todayData?.shift?.endTime || '18:00'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 2x2 Metric Rule Tiles */}
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <div
                    className="p-2.5 rounded-2 h-100"
                    style={{ backgroundColor: '#FFFFFF', border: `1px solid ${THEME.border}` }}
                  >
                    <div className="d-flex align-items-center gap-1.5 mb-1">
                      <span style={{ fontSize: '13px' }}>⏱️</span>
                      <span className="text-muted" style={{ fontSize: '11px', fontWeight: 600 }}>
                        Grace Limit
                      </span>
                    </div>
                    <div className="fw-bold" style={{ color: THEME.navy, fontSize: '14px' }}>
                      {todayData?.shift?.gracePeriodMinutes || 15} mins
                    </div>
                    <small className="text-muted" style={{ fontSize: '10px' }}>
                      Late punch threshold
                    </small>
                  </div>
                </div>

                <div className="col-6">
                  <div
                    className="p-2.5 rounded-2 h-100"
                    style={{ backgroundColor: '#FFFFFF', border: `1px solid ${THEME.border}` }}
                  >
                    <div className="d-flex align-items-center gap-1.5 mb-1">
                      <span style={{ fontSize: '13px' }}>🎯</span>
                      <span className="text-muted" style={{ fontSize: '11px', fontWeight: 600 }}>
                        Work Target
                      </span>
                    </div>
                    <div className="fw-bold" style={{ color: THEME.primary, fontSize: '14px' }}>
                      {todayData?.shift?.requiredHours || 8}.0 hrs
                    </div>
                    <small className="text-muted" style={{ fontSize: '10px' }}>
                      Daily expectancy
                    </small>
                  </div>
                </div>

                <div className="col-6">
                  <div
                    className="p-2.5 rounded-2 h-100"
                    style={{ backgroundColor: '#FFFFFF', border: `1px solid ${THEME.border}` }}
                  >
                    <div className="d-flex align-items-center gap-1.5 mb-1">
                      <span style={{ fontSize: '13px' }}>☕</span>
                      <span className="text-muted" style={{ fontSize: '11px', fontWeight: 600 }}>
                        Lunch Break
                      </span>
                    </div>
                    <div className="fw-bold" style={{ color: THEME.navy, fontSize: '14px' }}>
                      {todayData?.shift?.unpaidBreakMinutes || 60} mins
                    </div>
                    <small className="text-muted" style={{ fontSize: '10px' }}>
                      Unpaid interval
                    </small>
                  </div>
                </div>

                <div className="col-6">
                  <div
                    className="p-2.5 rounded-2 h-100"
                    style={{ backgroundColor: '#FFFFFF', border: `1px solid ${THEME.border}` }}
                  >
                    <div className="d-flex align-items-center gap-1.5 mb-1">
                      <span style={{ fontSize: '13px' }}>🌗</span>
                      <span className="text-muted" style={{ fontSize: '11px', fontWeight: 600 }}>
                        Half-Day Cutoff
                      </span>
                    </div>
                    <div className="fw-bold" style={{ color: '#D97706', fontSize: '14px' }}>
                      {todayData?.shift?.halfDayThresholdHours || 4}.0 hrs
                    </div>
                    <small className="text-muted" style={{ fontSize: '10px' }}>
                      Minimum presence
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="d-flex gap-2 pt-2 border-top" style={{ borderColor: THEME.border }}>
              <button
                className="btn btn-sm btn-outline-secondary flex-fill d-inline-flex align-items-center justify-content-center gap-1.5 shadow-none"
                style={{ fontSize: '12px', height: '36px', borderRadius: '6px', borderColor: THEME.border }}
                onClick={() => setShowCorrectionModal(true)}
              >
                <span>✏️</span>
                <span>Request Correction</span>
              </button>

              {todaysAttendance && todaysAttendance.workingHours >= 8 && (
                <button
                  className="btn btn-sm btn-outline-primary flex-fill d-inline-flex align-items-center justify-content-center gap-1.5 shadow-none"
                  style={{ fontSize: '12px', height: '36px', borderRadius: '6px', borderColor: THEME.primary }}
                  onClick={() => {
                    setOvertimeForm({
                      attendanceId: todaysAttendance._id,
                      requestedMinutes: 60,
                      reason: '',
                    });
                    setShowOvertimeModal(true);
                  }}
                >
                  <span>⏱️</span>
                  <span>Claim Overtime</span>
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Monthly Interactive Calendar View */}
      <div className="mb-4">
        <AttendanceCalendarView />
      </div>

      {/* Personal Attendance History Section */}
      <div
        className="rounded-3 shadow-sm mb-4 overflow-hidden"
        style={{
          backgroundColor: THEME.cardBg,
          border: `1px solid ${THEME.border}`,
        }}
      >
        <div
          className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center p-3 p-md-4 border-bottom gap-2"
          style={{ borderColor: THEME.border }}
        >
          <div>
            <h5 className="fw-bold mb-0" style={{ color: THEME.navy }}>
              📜 Attendance History Ledger
            </h5>
            <small className="text-secondary">Historical punch cards, status breakdown, and overtime</small>
          </div>

          <div className="btn-group btn-group-sm">
            <button
              className="btn btn-outline-secondary d-inline-flex align-items-center gap-1"
              style={{ fontSize: '12px', borderColor: THEME.border }}
              onClick={() => exportAttendancePDF({ title: `${user?.name || 'My'}_Attendance_Report`, records })}
            >
              📄 <span>Export PDF</span>
            </button>
            <button
              className="btn btn-outline-secondary d-inline-flex align-items-center gap-1"
              style={{ fontSize: '12px', borderColor: THEME.border }}
              onClick={() => exportAttendanceCSV({ title: `${user?.name || 'my'}_attendance`, records })}
            >
              📑 <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Loading / Empty States */}
        {loading ? (
          <div className="text-center py-5">
            <LoadingSpinner />
            <p className="text-muted small mt-2 mb-0">Retrieving punch history...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-5">
            <p className="text-muted small mb-0">No past attendance records found on file.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-responsive d-none d-md-block">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '13px' }}>
                <thead style={{ backgroundColor: THEME.surface, borderBottom: `2px solid ${THEME.border}` }}>
                  <tr>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600, padding: '12px 14px' }}>Date</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }}>Shift</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }}>Punch In</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }}>Punch Out</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }}>Lateness</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }}>Duration</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }}>Overtime</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }}>Status</th>
                    <th style={{ color: THEME.textSecondary, fontWeight: 600 }}>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    const statusBadge = getStatusBadgeStyle(r.status);
                    return (
                      <tr key={r._id} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                        <td className="fw-semibold" style={{ padding: '12px 14px', color: THEME.navy }}>
                          {r.date}
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border px-2 py-1" style={{ fontSize: '11px' }}>
                            {r.shiftId?.code || 'GEN'}
                          </span>
                        </td>
                        <td className="fw-medium">
                          {r.punchIn?.time
                            ? new Date(r.punchIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </td>
                        <td className="fw-medium">
                          {r.punchOut?.time ? (
                            new Date(r.punchOut.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          ) : (
                            <span className="badge text-danger" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                              Missing
                            </span>
                          )}
                        </td>
                        <td>
                          {r.lateMinutes > 0 ? (
                            <span
                              className="badge"
                              style={{ backgroundColor: THEME.warningBg, color: THEME.warningText, border: '1px solid #FDE68A' }}
                            >
                              +{r.lateMinutes}m
                            </span>
                          ) : (
                            <span className="text-muted">On time</span>
                          )}
                        </td>
                        <td>
                          <span className="fw-bold" style={{ color: THEME.primary }}>
                            {r.workingHours ? `${r.workingHours} hrs` : '0 hrs'}
                          </span>
                        </td>
                        <td>
                          <span
                            className="fw-semibold"
                            style={{ color: r.overtimeMinutes > 0 ? THEME.successText : THEME.textSecondary }}
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
                        <td>
                          <span className="badge bg-light text-secondary border" style={{ fontSize: '11px' }}>
                            {r.punchOut?.method || (r.isAutoPunchOut ? 'Auto' : 'Manual')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="d-block d-md-none p-2">
              {records.map((r) => {
                const statusBadge = getStatusBadgeStyle(r.status);
                return (
                  <div
                    key={r._id}
                    className="p-3 mb-2 rounded-3"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: `1px solid ${THEME.border}`,
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <div className="fw-bold" style={{ color: THEME.navy }}>
                          {r.date}
                        </div>
                        <small className="text-secondary">{r.shiftId?.code || 'Shift'}</small>
                      </div>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: statusBadge.bg,
                          color: statusBadge.color,
                          border: `1px solid ${statusBadge.border}`,
                          fontSize: '11px',
                        }}
                      >
                        {r.status || 'Present'}
                      </span>
                    </div>

                    <div
                      className="p-2 rounded mb-2 d-flex justify-content-between text-center"
                      style={{ backgroundColor: THEME.surface, fontSize: '11px' }}
                    >
                      <div>
                        <span className="text-secondary d-block">PUNCH IN</span>
                        <strong className="text-dark">
                          {r.punchIn?.time
                            ? new Date(r.punchIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-secondary d-block">PUNCH OUT</span>
                        <strong className="text-dark">
                          {r.punchOut?.time
                            ? new Date(r.punchOut.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Missing'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-secondary d-block">TOTAL</span>
                        <strong style={{ color: THEME.primary }}>{r.workingHours || 0}h</strong>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center text-muted small pt-1">
                      <span>Late: {r.lateMinutes > 0 ? `+${r.lateMinutes}m` : '0m'}</span>
                      <span>OT: {r.overtimeMinutes ? `${(r.overtimeMinutes / 60).toFixed(1)}h` : '0h'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div
                className="d-flex justify-content-between align-items-center p-3 border-top flex-wrap gap-2"
                style={{ borderColor: THEME.border, backgroundColor: '#FAFAFA' }}
              >
                <span className="small text-secondary">
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

      {/* Request Correction Modal */}
      {showCorrectionModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 1060,
          }}
          onClick={() => setShowCorrectionModal(false)}
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
                  Request Attendance Adjustment
                </h6>
                <small className="text-secondary">Submit punch timing discrepancy for review</small>
              </div>
              <button className="btn-close" onClick={() => setShowCorrectionModal(false)}></button>
            </div>

            <form onSubmit={handleCorrectionSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Attendance Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={correctionForm.date}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, date: e.target.value })}
                  style={{ borderColor: THEME.border }}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Dispute Category</label>
                <select
                  className="form-select form-select-sm"
                  value={correctionForm.correctionType}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, correctionType: e.target.value })}
                  style={{ borderColor: THEME.border }}
                >
                  <option value="MISSED_PUNCH_IN">Missed Punch-In</option>
                  <option value="MISSED_PUNCH_OUT">Missed Punch-Out</option>
                  <option value="INCORRECT_HOURS">Incorrect Working Hours</option>
                  <option value="STATUS_DISPUTE">Incorrect Attendance Status</option>
                  <option value="OTHER">Other Discrepancy</option>
                </select>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Effective Punch-In</label>
                  <input
                    type="time"
                    className="form-control form-control-sm"
                    value={correctionForm.requestedPunchIn}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, requestedPunchIn: e.target.value })}
                    style={{ borderColor: THEME.border }}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Effective Punch-Out</label>
                  <input
                    type="time"
                    className="form-control form-control-sm"
                    value={correctionForm.requestedPunchOut}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, requestedPunchOut: e.target.value })}
                    style={{ borderColor: THEME.border }}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">
                  Reason for Adjustment <span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control form-control-sm"
                  rows="3"
                  placeholder="Explain why punch wasn't registered properly..."
                  value={correctionForm.reason}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                  style={{ borderColor: THEME.border }}
                  required
                ></textarea>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4">
                <button
                  type="button"
                  className="btn btn-sm btn-light border"
                  onClick={() => setShowCorrectionModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm btn-primary"
                  style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Overtime Modal */}
      {showOvertimeModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 1060,
          }}
          onClick={() => setShowOvertimeModal(false)}
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
                  Submit Overtime Claim
                </h6>
                <small className="text-secondary">Request extra hours approval</small>
              </div>
              <button className="btn-close" onClick={() => setShowOvertimeModal(false)}></button>
            </div>

            <form onSubmit={handleOvertimeSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Overtime Duration (Minutes)</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={overtimeForm.requestedMinutes}
                  onChange={(e) => setOvertimeForm({ ...overtimeForm, requestedMinutes: parseInt(e.target.value, 10) || 0 })}
                  min="15"
                  step="15"
                  style={{ borderColor: THEME.border }}
                  required
                />
                <small className="text-secondary" style={{ fontSize: '11px' }}>
                  Equivalent to {(overtimeForm.requestedMinutes / 60).toFixed(1)} overtime hours.
                </small>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">
                  Work / Deliverable Details <span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control form-control-sm"
                  rows="3"
                  placeholder="Detail the deliverables executed during this overtime period..."
                  value={overtimeForm.reason}
                  onChange={(e) => setOvertimeForm({ ...overtimeForm, reason: e.target.value })}
                  style={{ borderColor: THEME.border }}
                  required
                ></textarea>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4">
                <button
                  type="button"
                  className="btn btn-sm btn-light border"
                  onClick={() => setShowOvertimeModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm btn-primary"
                  style={{ backgroundColor: THEME.primary, borderColor: THEME.primary }}
                >
                  Submit Overtime
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAttendancePage;