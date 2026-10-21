import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { calendarApi } from '../../api/calendarApi';
import { usePermission } from '../../hooks/usePermission';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import { useSocket } from '../../components/providers/SocketProvider';

// Unified Enterprise Design Tokens
const ERP = {
  primary: '#087FF5',
  primaryBg: '#EBF4FE',
  sidebar: '#071A33',
  mainBg: '#F4F7FB',
  cardBg: '#FFFFFF',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  success: '#16A34A',
  successBg: '#DCFCE7',
  warning: '#D97706',
  warningBg: '#FEF3C7',
  error: '#DC2626',
  errorBg: '#FEE2E2',
  purple: '#7C3AED',
  purpleBg: '#EDE9FE',
};

// Safe date normalization helper to avoid UTC offset rollback issues
const parseLocalDate = (dateVal) => {
  if (!dateVal) return new Date();
  if (typeof dateVal === 'string' && dateVal.length === 10) {
    const [y, m, d] = dateVal.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? new Date() : d;
};

const CalendarMainPage = () => {
  let navigate;
  try {
    navigate = useNavigate();
  } catch {
    navigate = null;
  }

  const handleBack = () => {
    if (navigate) {
      navigate(-1);
    } else {
      window.history.back();
    }
  };

  const { can } = usePermission();
  const socket = useSocket();
  const canAdd = can('calendar', 'create') || can('holiday', 'create');
  const canDelete = can('calendar', 'delete') || can('holiday', 'delete');

  const [yearlyEvents, setYearlyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [mobileTab, setMobileTab] = useState('grid'); // 'grid' | 'agenda'

  // Navigation
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Slide Animation State
  const [slideDirection, setSlideDirection] = useState(''); // 'slide-left' | 'slide-right' | ''

  // Multi-axis Touch tracking for Angle-based Swipe
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewModal, setViewModal] = useState({ show: false, event: null });
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    eventType: 'Holiday',
    customClassification: '',
    daySpan: 'single',
    dayType: 'full',
    halfDaySession: 'First Half',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '18:00',
    description: '',
    holidayCategory: 'Mandatory Public Holiday',
    meetingLocation: '',
  });

  const normalizeEvent = (e) => {
    const rawType = (e.eventType || e.type || (e.isHoliday ? 'Holiday' : 'Other') || 'Other').trim();
    let normalizedType = 'Other';
    if (/holiday/i.test(rawType)) normalizedType = 'Holiday';
    else if (/meeting/i.test(rawType)) normalizedType = 'Meeting';
    else normalizedType = 'Other';

    const start = parseLocalDate(e.startDate || e.date || e.start);
    const end = parseLocalDate(e.endDate || e.startDate || e.date || e.start);

    if (normalizedType === 'Holiday' && end.getHours() === 0 && end.getMinutes() === 0) {
      end.setHours(23, 59, 59, 999);
    }

    return {
      _id: e._id || e.id || `ev-${Math.random()}`,
      title: e.title || e.name || e.holidayName || 'Scheduled Event',
      eventType: normalizedType,
      customClassification: e.customClassification || (normalizedType === 'Other' ? rawType : ''),
      daySpan: e.daySpan || (start.toDateString() === end.toDateString() ? 'single' : 'multiple'),
      dayType: e.dayType || 'full',
      halfDaySession: e.halfDaySession || '',
      startDate: start,
      endDate: end,
      description: e.description || e.remarks || e.note || '',
      holidayCategory: e.holidayCategory || e.category || 'Standard',
      meetingLocation: e.meetingLocation || e.location || '',
      raw: e,
    };
  };

  const fetchYearlyEvents = useCallback(async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const startOfYear = new Date(year, 0, 1, 0, 0, 0, 0).toISOString();
      const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999).toISOString();

      const res = await calendarApi.getEvents({
        startDate: startOfYear,
        endDate: endOfYear,
        year: year,
      });

      const rawList = res?.data?.data || res?.data?.events || res?.data?.holidays || (Array.isArray(res?.data) ? res.data : []);
      const sanitized = rawList.map(normalizeEvent);
      setYearlyEvents(sanitized);
    } catch (err) {
      console.error('Failed to load schedule items:', err);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchYearlyEvents();

    if (socket) {
      const reload = () => fetchYearlyEvents();
      socket.on('calendar_updated', reload);
      socket.on('holiday_created', reload);
      socket.on('holiday_updated', reload);
      socket.on('event_created', reload);
      return () => {
        socket.off('calendar_updated', reload);
        socket.off('holiday_created', reload);
        socket.off('holiday_updated', reload);
        socket.off('event_created', reload);
      };
    }
  }, [fetchYearlyEvents, socket]);

  const getEventMeta = (type, customLabel) => {
    switch (type) {
      case 'Holiday':
        return { color: ERP.success, bg: ERP.successBg, border: '#86EFAC', dot: '#16A34A', icon: '🌴', label: 'Company Holiday' };
      case 'Meeting':
        return { color: ERP.primary, bg: ERP.primaryBg, border: '#BFDBFE', dot: '#087FF5', icon: '👥', label: 'Corporate Meeting' };
      default:
        return { color: ERP.purple, bg: ERP.purpleBg, border: '#DDD6FE', dot: '#7C3AED', icon: '📝', label: customLabel || 'Other' };
    }
  };

  const handlePrevMonth = () => {
    setSlideDirection('slide-right');
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setTimeout(() => setSlideDirection(''), 250);
  };

  const handleNextMonth = () => {
    setSlideDirection('slide-left');
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setTimeout(() => setSlideDirection(''), 250);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  // Angle-Based Gesture Swipe Recognition
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchStartXRef.current - touchEndX;
    const deltaY = touchStartYRef.current - touchEndY;

    // Angle calculation: swipe is valid if horizontal movement is at least 1.5x greater than vertical movement
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) * 1.5;

    if (isHorizontalSwipe && Math.abs(deltaX) > 40) {
      if (deltaX > 0) {
        handleNextMonth(); // Swiped Left: Advance to Next Month
      } else {
        handlePrevMonth(); // Swiped Right: Return to Prev Month
      }
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const isSingle = formData.daySpan === 'single';
      const effectiveEndDate = isSingle ? formData.startDate : formData.endDate;

      let finalStart = '';
      let finalEnd = '';

      if (formData.dayType === 'half') {
        if (formData.halfDaySession === 'First Half') {
          finalStart = `${formData.startDate}T09:00:00.000Z`;
          finalEnd = `${formData.startDate}T13:30:00.000Z`;
        } else {
          finalStart = `${formData.startDate}T13:30:00.000Z`;
          finalEnd = `${formData.startDate}T18:00:00.000Z`;
        }
      } else {
        finalStart = `${formData.startDate}T00:00:00.000Z`;
        finalEnd = `${effectiveEndDate}T23:59:59.999Z`;
      }

      const finalClassification =
        formData.eventType === 'Other'
          ? (formData.customClassification.trim() || 'Other')
          : formData.eventType;

      const payload = {
        title: formData.title.trim(),
        eventType: finalClassification,
        customClassification: formData.eventType === 'Other' ? formData.customClassification.trim() : '',
        startDate: finalStart,
        endDate: finalEnd,
        daySpan: formData.daySpan,
        dayType: formData.dayType,
        halfDaySession: formData.dayType === 'half' ? formData.halfDaySession : null,
        description: formData.description,
        isHoliday: formData.eventType === 'Holiday',
        isPublic: true,
        holidayCategory: formData.eventType === 'Holiday' ? formData.holidayCategory : undefined,
        meetingLocation: formData.eventType === 'Meeting' ? formData.meetingLocation : undefined,
      };

      await calendarApi.createEvent(payload);
      setShowAddModal(false);
      setFormData({
        title: '',
        eventType: 'Holiday',
        customClassification: '',
        daySpan: 'single',
        dayType: 'full',
        halfDaySession: 'First Half',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '18:00',
        description: '',
        holidayCategory: 'Mandatory Public Holiday',
        meetingLocation: '',
      });
      fetchYearlyEvents();
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating schedule record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this schedule entry?')) return;
    try {
      await calendarApi.deleteEvent(id);
      setViewModal({ show: false, event: null });
      fetchYearlyEvents();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove entry');
    }
  };

  const filteredEvents = useMemo(() => {
    if (activeFilter === 'All') return yearlyEvents;
    return yearlyEvents.filter((ev) => ev.eventType === activeFilter);
  }, [yearlyEvents, activeFilter]);

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const upcomingEvents = useMemo(() => {
    return filteredEvents
      .filter((e) => new Date(e.endDate).getTime() >= todayMidnight.getTime())
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [filteredEvents]);

  const holidaysList = yearlyEvents.filter((e) => e.eventType === 'Holiday');
  const remainingHolidays = holidaysList.filter((e) => new Date(e.endDate).getTime() >= todayMidnight.getTime()).length;
  const nextHoliday = holidaysList
    .filter((e) => new Date(e.startDate).getTime() >= todayMidnight.getTime())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];

  const getDaysDiffNotice = (dStr) => {
    const target = new Date(dStr);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 0) return 'Concluded';
    return `In ${diffDays}d`;
  };

  // Grid Construction
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return days;
  }, [year, month, daysInMonth, firstDayIndex]);

  const getDayEvents = useCallback((dateObj) => {
    if (!dateObj) return [];
    const cellStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0, 0).getTime();
    const cellEnd = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999).getTime();

    return filteredEvents.filter((ev) => {
      const s = ev.startDate.getTime();
      const e = ev.endDate.getTime();
      return s <= cellEnd && e >= cellStart;
    });
  }, [filteredEvents]);

  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const selectedDayEvents = useMemo(() => getDayEvents(selectedDate), [selectedDate, getDayEvents]);

  return (
    <>
      <style>{`
        .erp-card-hover {
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
        }
        .erp-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06) !important;
        }
        .erp-btn-hover {
          transition: all 0.18s ease-in-out;
        }
        .erp-btn-hover:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(8, 127, 245, 0.25);
          filter: brightness(1.05);
        }
        .erp-big-angle-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #E2E8F0;
          background-color: #FFFFFF;
          color: #071A33;
          font-size: 1.45rem;
          font-weight: 700;
          line-height: 1;
          cursor: pointer;
          transition: all 0.18s ease;
          user-select: none;
        }
        .erp-big-angle-btn:hover {
          background-color: #E2E8F0 !important;
          color: #087FF5 !important;
          transform: scale(1.08);
        }
        .erp-big-angle-btn:active {
          transform: scale(0.95);
        }
        .erp-cal-cell {
          transition: background-color 0.15s ease;
        }
        .erp-cal-cell:hover {
          background-color: #F1F5F9 !important;
          z-index: 3;
        }
        .slide-left {
          animation: slideLeftAnim 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .slide-right {
          animation: slideRightAnim 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideLeftAnim {
          from { opacity: 0.55; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideRightAnim {
          from { opacity: 0.55; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div
        className="container-fluid"
        style={{
          backgroundColor: ERP.mainBg,
          minHeight: '100vh',
          padding: '14px 16px',
        }}
      >
        {/* Top Header Card with Prominent Big Angle Back Button */}
        <div
          className="card shadow-sm border-0 mb-3 rounded-3"
          style={{
            backgroundColor: ERP.cardBg,
            padding: '14px 18px',
          }}
        >
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
            <div className="d-flex align-items-center gap-3">
              {/* Big Size Back Angle Button */}
              <button
                type="button"
                className="erp-big-angle-btn shadow-sm"
                onClick={handleBack}
                title="Go Back"
              >
                ‹
              </button>

              <div>
                <div className="d-flex align-items-center gap-1.5 mb-0.5">
                  <span
                    className="badge rounded-pill fw-bold"
                    style={{ backgroundColor: ERP.primaryBg, color: ERP.primary, fontSize: '0.64rem', padding: '3px 8px' }}
                  >
                    WORKFORCE SCHEDULE
                  </span>
                  <span
                    className="badge rounded-pill fw-semibold"
                    style={{ backgroundColor: '#F1F5F9', color: ERP.textSecondary, fontSize: '0.64rem', padding: '3px 8px' }}
                  >
                    FY {currentDate.getFullYear()}
                  </span>
                </div>
                <h5 className="fw-bold mb-0" style={{ color: ERP.textPrimary, fontSize: '1.05rem', letterSpacing: '-0.2px' }}>
                  Company Calendar & Holidays
                </h5>
              </div>
            </div>

            <div>
              {canAdd && (
                <button
                  className="btn btn-sm d-flex align-items-center justify-content-center gap-1.5 fw-bold rounded-2 px-3 py-2 w-100 shadow-sm erp-btn-hover"
                  style={{
                    backgroundColor: ERP.primary,
                    borderColor: ERP.primary,
                    color: '#fff',
                    fontSize: '0.80rem',
                  }}
                  onClick={() => setShowAddModal(true)}
                >
                  <span>+ Add Calendar Entry</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="row g-2 g-md-3 mb-3">
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm rounded-3 p-3 h-100 erp-card-hover" style={{ backgroundColor: ERP.cardBg }}>
              <div className="d-flex justify-content-between align-items-center">
                <span style={{ fontSize: '0.65rem', fontWeight: '700', color: ERP.textSecondary, textTransform: 'uppercase' }}>
                  Total Holidays
                </span>
                <span style={{ fontSize: '0.95rem' }}>🌴</span>
              </div>
              <h5 className="fw-bold mb-0 mt-1" style={{ color: ERP.sidebar, fontSize: '1.25rem' }}>
                {holidaysList.length}
              </h5>
              <small style={{ fontSize: '0.65rem', color: ERP.textSecondary }}>Official year schedule</small>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm rounded-3 p-3 h-100 erp-card-hover" style={{ backgroundColor: ERP.cardBg }}>
              <div className="d-flex justify-content-between align-items-center">
                <span style={{ fontSize: '0.65rem', fontWeight: '700', color: ERP.textSecondary, textTransform: 'uppercase' }}>
                  Remaining Off
                </span>
                <span style={{ fontSize: '0.95rem' }}>🏖️</span>
              </div>
              <h5 className="fw-bold mb-0 mt-1" style={{ color: ERP.success, fontSize: '1.25rem' }}>
                {remainingHolidays}
              </h5>
              <small style={{ fontSize: '0.65rem', color: ERP.textSecondary }}>Pending current FY</small>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm rounded-3 p-3 h-100 erp-card-hover" style={{ backgroundColor: ERP.cardBg }}>
              <div className="d-flex justify-content-between align-items-center">
                <span style={{ fontSize: '0.65rem', fontWeight: '700', color: ERP.textSecondary, textTransform: 'uppercase' }}>
                  Next Holiday
                </span>
                <span
                  className="badge rounded-pill fw-bold"
                  style={{ backgroundColor: ERP.warningBg, color: ERP.warning, fontSize: '0.60rem' }}
                >
                  {nextHoliday ? getDaysDiffNotice(nextHoliday.startDate) : 'None'}
                </span>
              </div>
              <div className="fw-bold text-truncate mt-1" style={{ color: ERP.sidebar, fontSize: '0.82rem' }}>
                {nextHoliday ? nextHoliday.title : 'None Scheduled'}
              </div>
              <small className="text-truncate d-block" style={{ fontSize: '0.65rem', color: ERP.textSecondary }}>
                {nextHoliday ? nextHoliday.startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-'}
              </small>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm rounded-3 p-3 h-100 erp-card-hover" style={{ backgroundColor: ERP.cardBg }}>
              <div className="d-flex justify-content-between align-items-center">
                <span style={{ fontSize: '0.65rem', fontWeight: '700', color: ERP.textSecondary, textTransform: 'uppercase' }}>
                  Total Items
                </span>
                <span style={{ fontSize: '0.95rem' }}>📌</span>
              </div>
              <h5 className="fw-bold mb-0 mt-1" style={{ color: ERP.primary, fontSize: '1.25rem' }}>
                {yearlyEvents.length}
              </h5>
              <small style={{ fontSize: '0.65rem', color: ERP.textSecondary }}>Active schedule items</small>
            </div>
          </div>
        </div>

        {/* Filter and Mobile Segment Switch */}
        <div className="card border-0 shadow-sm rounded-3 p-2 p-md-2.5 mb-3" style={{ backgroundColor: ERP.cardBg }}>
          <div className="d-flex justify-content-between align-items-center gap-2">
            <div className="d-flex align-items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {[
                { id: 'All', label: 'All Items' },
                { id: 'Holiday', label: '🌴 Holidays' },
                { id: 'Meeting', label: '👥 Meetings' },
                { id: 'Other', label: '📝 Others' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className="btn btn-sm text-nowrap fw-semibold rounded-pill erp-btn-hover"
                  onClick={() => setActiveFilter(tab.id)}
                  style={{
                    fontSize: '0.72rem',
                    padding: '4px 12px',
                    backgroundColor: activeFilter === tab.id ? ERP.sidebar : '#F1F5F9',
                    color: activeFilter === tab.id ? '#FFFFFF' : ERP.textSecondary,
                    border: 'none',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="d-flex d-md-none gap-1 bg-light p-1 rounded-2 flex-shrink-0">
              <button
                className={`btn btn-sm py-1 px-2.5 rounded-1 fw-bold ${mobileTab === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-muted'}`}
                style={{ fontSize: '0.70rem' }}
                onClick={() => setMobileTab('grid')}
              >
                Grid
              </button>
              <button
                className={`btn btn-sm py-1 px-2.5 rounded-1 fw-bold ${mobileTab === 'agenda' ? 'bg-white shadow-sm text-primary' : 'text-muted'}`}
                style={{ fontSize: '0.70rem' }}
                onClick={() => setMobileTab('agenda')}
              >
                Agenda
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-5 text-center">
            <LoadingSpinner text="Loading schedule..." />
          </div>
        ) : (
          <div className="row g-3">
            {/* Main Calendar Grid Column with Mobile Angle-Aware Side Swiping */}
            <div
              className={`col-12 col-lg-8 ${mobileTab === 'agenda' ? 'd-none d-md-block' : 'd-block'}`}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className="card border-0 shadow-sm rounded-3 p-3 p-md-3.5 erp-card-hover" style={{ backgroundColor: ERP.cardBg }}>
                {/* Month Navigation with Big Size Angle Buttons */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="d-flex align-items-center gap-2">
                    {/* Big Size Previous Month Angle */}
                    <button
                      className="erp-big-angle-btn shadow-sm"
                      onClick={handlePrevMonth}
                      title="Previous Month"
                    >
                      ‹
                    </button>

                    <span className="fw-bold px-2 text-center" style={{ fontSize: '0.96rem', minWidth: '140px', color: ERP.sidebar }}>
                      {currentDate.toLocaleString('default', { month: 'short', year: 'numeric' })}
                    </span>

                    {/* Big Size Next Month Angle */}
                    <button
                      className="erp-big-angle-btn shadow-sm"
                      onClick={handleNextMonth}
                      title="Next Month"
                    >
                      ›
                    </button>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <span className="d-block d-md-none text-muted" style={{ fontSize: '0.62rem' }}>
                      👈 Swipe month 👉
                    </span>
                    <button
                      className="btn btn-sm fw-bold rounded-2 px-3 py-1.5 erp-btn-hover"
                      style={{
                        backgroundColor: ERP.primaryBg,
                        color: ERP.primary,
                        border: `1px solid ${ERP.primary}`,
                        fontSize: '0.74rem',
                      }}
                      onClick={handleToday}
                    >
                      Today
                    </button>
                  </div>
                </div>

                {/* Day of Week Labels */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    textAlign: 'center',
                    fontSize: '0.68rem',
                    fontWeight: '700',
                    marginBottom: '6px',
                  }}
                >
                  <span className="py-1" style={{ color: ERP.error }}>SUN</span>
                  <span className="py-1" style={{ color: ERP.textSecondary }}>MON</span>
                  <span className="py-1" style={{ color: ERP.textSecondary }}>TUE</span>
                  <span className="py-1" style={{ color: ERP.textSecondary }}>WED</span>
                  <span className="py-1" style={{ color: ERP.textSecondary }}>THU</span>
                  <span className="py-1" style={{ color: ERP.textSecondary }}>FRI</span>
                  <span className="py-1" style={{ color: ERP.primary }}>SAT</span>
                </div>

                {/* Grid Canvas */}
                <div
                  className={slideDirection}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    backgroundColor: ERP.border,
                    gap: '1px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: `1px solid ${ERP.border}`,
                  }}
                >
                  {calendarDays.map((dayObj, idx) => {
                    if (!dayObj) {
                      return <div key={`empty-${idx}`} style={{ backgroundColor: '#F8FAFC', minHeight: '64px' }} />;
                    }

                    const evList = getDayEvents(dayObj);
                    const isCurrentDay = isSameDay(dayObj, new Date());
                    const isDaySelected = isSameDay(dayObj, selectedDate);
                    const isSunday = dayObj.getDay() === 0;

                    return (
                      <div
                        key={dayObj.toISOString()}
                        onClick={() => setSelectedDate(dayObj)}
                        className="erp-cal-cell"
                        style={{
                          backgroundColor: isDaySelected ? '#EFF6FF' : '#FFFFFF',
                          minHeight: '64px',
                          maxHeight: '72px',
                          padding: '4px 5px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          outline: isDaySelected ? `2px solid ${ERP.primary}` : 'none',
                          outlineOffset: '-2px',
                          zIndex: isDaySelected ? 2 : 1,
                        }}
                      >
                        {/* Cell Header */}
                        <div className="d-flex justify-content-between align-items-center">
                          <span
                            style={{
                              width: '22px',
                              height: '22px',
                              fontSize: '0.74rem',
                              fontWeight: '700',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '50%',
                              backgroundColor: isCurrentDay ? ERP.primary : 'transparent',
                              color: isCurrentDay ? '#FFFFFF' : isSunday ? ERP.error : ERP.textPrimary,
                            }}
                          >
                            {dayObj.getDate()}
                          </span>
                          {evList.some((e) => e.eventType === 'Holiday') && (
                            <span style={{ fontSize: '0.64rem' }}>🌴</span>
                          )}
                        </div>

                        {/* Desktop Chip View */}
                        <div className="d-none d-md-block overflow-hidden">
                          {evList.slice(0, 1).map((ev) => {
                            const meta = getEventMeta(ev.eventType, ev.customClassification);
                            return (
                              <div
                                key={ev._id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewModal({ show: true, event: ev });
                                }}
                                className="text-truncate rounded px-1 fw-semibold erp-btn-hover"
                                style={{
                                  fontSize: '0.63rem',
                                  lineHeight: '15px',
                                  backgroundColor: meta.bg,
                                  color: meta.color,
                                  borderLeft: `3px solid ${meta.color}`,
                                  cursor: 'pointer',
                                }}
                                title={ev.title}
                              >
                                {ev.title}
                              </div>
                            );
                          })}
                          {evList.length > 1 && (
                            <span style={{ fontSize: '0.58rem', color: ERP.textSecondary, fontWeight: '700' }}>
                              +{evList.length - 1} more
                            </span>
                          )}
                        </div>

                        {/* Mobile Indicator Dots */}
                        <div className="d-flex d-md-none align-items-center justify-content-center gap-1 mt-auto">
                          {evList.slice(0, 3).map((ev) => (
                            <span
                              key={ev._id}
                              style={{
                                width: '5px',
                                height: '5px',
                                borderRadius: '50%',
                                backgroundColor: getEventMeta(ev.eventType, ev.customClassification).dot,
                                display: 'inline-block',
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mobile Selected Date Inspector */}
                <div className="d-block d-md-none mt-2.5 p-2.5 rounded-2 border bg-light">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold text-dark" style={{ fontSize: '0.78rem' }}>
                      {selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="badge bg-secondary rounded-pill" style={{ fontSize: '0.62rem' }}>
                      {selectedDayEvents.length} items
                    </span>
                  </div>

                  {selectedDayEvents.length === 0 ? (
                    <p className="text-muted text-center small mb-0 py-1.5" style={{ fontSize: '0.72rem' }}>
                      No events scheduled
                    </p>
                  ) : (
                    <div className="d-flex flex-column gap-1.5">
                      {selectedDayEvents.map((ev) => {
                        const meta = getEventMeta(ev.eventType, ev.customClassification);
                        return (
                          <div
                            key={ev._id}
                            className="p-2 bg-white rounded-2 shadow-sm d-flex justify-content-between align-items-center erp-card-hover"
                            style={{ borderLeft: `3.5px solid ${meta.color}`, cursor: 'pointer' }}
                            onClick={() => setViewModal({ show: true, event: ev })}
                          >
                            <div className="text-truncate me-2">
                              <div className="fw-bold text-truncate" style={{ fontSize: '0.76rem', color: ERP.sidebar }}>
                                {meta.icon} {ev.title}
                              </div>
                              <small className="text-muted" style={{ fontSize: '0.66rem' }}>
                                {ev.startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                {ev.dayType === 'half' ? ` (${ev.halfDaySession || 'Half Day'})` : ''}
                              </small>
                            </div>
                            <span className="badge fw-semibold" style={{ backgroundColor: meta.bg, color: meta.color, fontSize: '0.62rem' }}>
                              {ev.customClassification || ev.eventType}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Side Upcoming Agenda Column */}
            <div className={`col-12 col-lg-4 ${mobileTab === 'grid' ? 'd-none d-md-block' : 'd-block'}`}>
              <div className="card border-0 shadow-sm rounded-3 p-3 p-md-3.5 h-100 erp-card-hover" style={{ backgroundColor: ERP.cardBg }}>
                <div className="d-flex justify-content-between align-items-center mb-2.5">
                  <div>
                    <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: '0.88rem' }}>Upcoming Schedule</h6>
                    <small style={{ fontSize: '0.68rem', color: ERP.textSecondary }}>Chronological activity timeline</small>
                  </div>
                  <button
                    className="btn btn-sm btn-light rounded-circle px-1.5 py-0 erp-btn-hover"
                    onClick={fetchYearlyEvents}
                    title="Refresh"
                    style={{ height: '30px', width: '30px' }}
                  >
                    ↻
                  </button>
                </div>

                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="fs-3 mb-1">🏖️</div>
                    <h6 className="fw-bold text-dark mb-0.5" style={{ fontSize: '0.82rem' }}>No Upcoming Items</h6>
                    <p className="text-muted small mb-0" style={{ fontSize: '0.70rem' }}>No schedule entries found</p>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2" style={{ maxHeight: '440px', overflowY: 'auto' }}>
                    {upcomingEvents.slice(0, 10).map((ev) => {
                      const meta = getEventMeta(ev.eventType, ev.customClassification);
                      const daysNotice = getDaysDiffNotice(ev.startDate);

                      return (
                        <div
                          key={ev._id}
                          className="p-2 rounded-2 d-flex align-items-center justify-content-between border erp-card-hover"
                          onClick={() => setViewModal({ show: true, event: ev })}
                          style={{
                            backgroundColor: '#F8FAFC',
                            borderLeft: `4px solid ${meta.color}`,
                            cursor: 'pointer',
                          }}
                        >
                          <div className="d-flex align-items-center gap-2 text-truncate me-2">
                            <div
                              className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                              style={{ width: '28px', height: '28px', backgroundColor: meta.bg, fontSize: '0.85rem' }}
                            >
                              {meta.icon}
                            </div>
                            <div className="text-truncate">
                              <h6 className="fw-bold mb-0 text-truncate" style={{ fontSize: '0.78rem', color: ERP.sidebar }}>
                                {ev.title}
                              </h6>
                              <div className="d-flex align-items-center gap-1.5 mt-0.5">
                                <small className="fw-semibold text-muted" style={{ fontSize: '0.66rem' }}>
                                  {ev.startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </small>
                                <span
                                  className="badge rounded-pill"
                                  style={{ backgroundColor: meta.bg, color: meta.color, fontSize: '0.60rem' }}
                                >
                                  {ev.customClassification || ev.eventType}
                                </span>
                              </div>
                            </div>
                          </div>

                          <span
                            className="badge rounded-pill fw-bold flex-shrink-0"
                            style={{
                              backgroundColor: daysNotice === 'Today' ? ERP.successBg : '#fff',
                              color: daysNotice === 'Today' ? ERP.success : ERP.textSecondary,
                              border: `1px solid ${ERP.border}`,
                              fontSize: '0.64rem',
                            }}
                          >
                            {daysNotice}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Entry Modal with Full Padding Applied to Targeted Sections */}
        <Modal show={showAddModal} title="Add Calendar / Schedule Entry" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddSubmit} className="p-1 p-md-2">
            {/* Classification */}
            <div className="mb-3">
              <label className="form-label fw-bold text-muted mb-1" style={{ fontSize: '0.74rem' }}>
                Classification *
              </label>
              <select
                className="form-select form-select-sm"
                value={formData.eventType}
                onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                style={{ fontSize: '0.82rem', padding: '8px 12px' }}
              >
                <option value="Holiday">🌴 Official Company Holiday</option>
                <option value="Meeting">👥 Corporate / Team Meeting</option>
                <option value="Other">📝 Others (Custom)</option>
              </select>
            </div>

            {/* Specify Classification Name * with Enhanced Padding */}
            {formData.eventType === 'Other' && (
              <div
                className="mb-3 rounded-3 bg-light border"
                style={{
                  padding: '14px 16px',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                <label
                  className="form-label fw-bold text-muted mb-1.5 d-block"
                  style={{ fontSize: '0.72rem', letterSpacing: '0.3px', textTransform: 'uppercase' }}
                >
                  Specify Classification Name *
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="e.g., Training Workshop, Client Visit, Server Maintenance"
                  value={formData.customClassification}
                  onChange={(e) => setFormData({ ...formData, customClassification: e.target.value })}
                  required={formData.eventType === 'Other'}
                  style={{
                    fontSize: '0.82rem',
                    padding: '8px 12px',
                    borderRadius: '6px',
                  }}
                />
              </div>
            )}

            {/* Title */}
            <div className="mb-3">
              <label className="form-label fw-bold text-muted mb-1" style={{ fontSize: '0.74rem' }}>
                Title *
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder={
                  formData.eventType === 'Holiday'
                    ? 'e.g., Diwali, Independence Day'
                    : formData.eventType === 'Meeting'
                    ? 'e.g., Annual Strategy Review'
                    : 'e.g., Team Offsite / Training'
                }
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                style={{ fontSize: '0.82rem', padding: '8px 12px' }}
              />
            </div>

            {/* Holiday Category with Enhanced Padding */}
            {formData.eventType === 'Holiday' && (
              <div
                className="mb-3 rounded-3 bg-light border"
                style={{
                  padding: '14px 16px',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                <label
                  className="form-label fw-bold text-muted mb-1.5 d-block"
                  style={{ fontSize: '0.72rem', letterSpacing: '0.3px', textTransform: 'uppercase' }}
                >
                  Holiday Category
                </label>
                <select
                  className="form-select form-select-sm"
                  value={formData.holidayCategory}
                  onChange={(e) => setFormData({ ...formData, holidayCategory: e.target.value })}
                  style={{
                    fontSize: '0.82rem',
                    padding: '8px 12px',
                    borderRadius: '6px',
                  }}
                >
                  <option value="Mandatory Public Holiday">Public / Gazetted (Mandatory Off)</option>
                  <option value="Optional Holiday">Restricted / Optional Holiday</option>
                  <option value="Company Celebration">Company Special Day / Founder's Day</option>
                </select>
              </div>
            )}

            {formData.eventType === 'Meeting' && (
              <div className="mb-3 rounded-3 bg-light border" style={{ padding: '14px 16px' }}>
                <label
                  className="form-label fw-bold text-muted mb-1.5 d-block"
                  style={{ fontSize: '0.72rem', letterSpacing: '0.3px', textTransform: 'uppercase' }}
                >
                  Meeting Location or Link
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="e.g., Conference Room B or https://meet.google.com/..."
                  value={formData.meetingLocation}
                  onChange={(e) => setFormData({ ...formData, meetingLocation: e.target.value })}
                  style={{ fontSize: '0.82rem', padding: '8px 12px' }}
                />
              </div>
            )}

            {/* DAY RANGE & DURATION TYPE & Select Half Day Session Container with Full Responsive Padding */}
            <div
              className="rounded-3 bg-light border mb-3"
              style={{
                padding: '16px 18px',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <div className="row g-2.5">
                {/* DAY RANGE */}
                <div className="col-12 col-sm-6">
                  <label
                    className="form-label fw-bold text-muted mb-1.5 d-block"
                    style={{ fontSize: '0.70rem', letterSpacing: '0.4px', textTransform: 'uppercase' }}
                  >
                    DAY RANGE
                  </label>
                  <div className="btn-group w-100 shadow-sm" role="group">
                    <button
                      type="button"
                      className={`btn btn-sm ${formData.daySpan === 'single' ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
                      style={{ fontSize: '0.76rem', padding: '7px 10px', borderRadius: '6px 0 0 6px' }}
                      onClick={() => setFormData({ ...formData, daySpan: 'single' })}
                    >
                      Single Day
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${formData.daySpan === 'multiple' ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
                      style={{ fontSize: '0.76rem', padding: '7px 10px', borderRadius: '0 6px 6px 0' }}
                      onClick={() => setFormData({ ...formData, daySpan: 'multiple', dayType: 'full' })}
                    >
                      Multiple Days
                    </button>
                  </div>
                </div>

                {/* DURATION TYPE */}
                <div className="col-12 col-sm-6">
                  <label
                    className="form-label fw-bold text-muted mb-1.5 d-block"
                    style={{ fontSize: '0.70rem', letterSpacing: '0.4px', textTransform: 'uppercase' }}
                  >
                    DURATION TYPE
                  </label>
                  <div className="btn-group w-100 shadow-sm" role="group">
                    <button
                      type="button"
                      className={`btn btn-sm ${formData.dayType === 'full' ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
                      style={{ fontSize: '0.76rem', padding: '7px 10px', borderRadius: '6px 0 0 6px' }}
                      onClick={() => setFormData({ ...formData, dayType: 'full' })}
                    >
                      Full Day
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${formData.dayType === 'half' ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
                      style={{ fontSize: '0.76rem', padding: '7px 10px', borderRadius: '0 6px 6px 0' }}
                      onClick={() => setFormData({ ...formData, dayType: 'half', daySpan: 'single' })}
                    >
                      Half Day
                    </button>
                  </div>
                </div>
              </div>

              {/* Select Half Day Session with First Half and Second Half Interactive Cards */}
              {formData.dayType === 'half' && (
                <div
                  className="mt-3 pt-3 border-top"
                  style={{
                    borderColor: ERP.border,
                  }}
                >
                  <label
                    className="form-label fw-bold text-muted mb-2 d-block"
                    style={{ fontSize: '0.70rem', letterSpacing: '0.4px', textTransform: 'uppercase' }}
                  >
                    Select Half Day Session
                  </label>
                  <div className="d-flex flex-column flex-sm-row gap-2">
                    <label
                      className="d-flex align-items-center gap-2 p-2.5 rounded-2 border flex-grow-1"
                      style={{
                        padding: '10px 14px',
                        borderColor: formData.halfDaySession === 'First Half' ? ERP.primary : ERP.border,
                        backgroundColor: formData.halfDaySession === 'First Half' ? ERP.primaryBg : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="radio"
                        name="halfSession"
                        checked={formData.halfDaySession === 'First Half'}
                        onChange={() => setFormData({ ...formData, halfDaySession: 'First Half' })}
                        style={{ cursor: 'pointer' }}
                      />
                      <span className="fw-semibold text-dark" style={{ fontSize: '0.76rem' }}>
                        First Half (Morning)
                      </span>
                    </label>

                    <label
                      className="d-flex align-items-center gap-2 p-2.5 rounded-2 border flex-grow-1"
                      style={{
                        padding: '10px 14px',
                        borderColor: formData.halfDaySession === 'Second Half' ? ERP.primary : ERP.border,
                        backgroundColor: formData.halfDaySession === 'Second Half' ? ERP.primaryBg : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="radio"
                        name="halfSession"
                        checked={formData.halfDaySession === 'Second Half'}
                        onChange={() => setFormData({ ...formData, halfDaySession: 'Second Half' })}
                        style={{ cursor: 'pointer' }}
                      />
                      <span className="fw-semibold text-dark" style={{ fontSize: '0.76rem' }}>
                        Second Half (Afternoon)
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Date Pickers */}
            {formData.daySpan === 'single' ? (
              <div className="mb-3">
                <label className="form-label fw-bold text-muted mb-1" style={{ fontSize: '0.72rem' }}>
                  Event Date *
                </label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value, endDate: e.target.value })}
                  required
                  style={{ fontSize: '0.80rem', padding: '8px 12px' }}
                />
              </div>
            ) : (
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label fw-bold text-muted mb-1" style={{ fontSize: '0.72rem' }}>
                    Start Date *
                  </label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    style={{ fontSize: '0.80rem', padding: '8px 12px' }}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label fw-bold text-muted mb-1" style={{ fontSize: '0.72rem' }}>
                    End Date *
                  </label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={formData.endDate}
                    min={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                    style={{ fontSize: '0.80rem', padding: '8px 12px' }}
                  />
                </div>
              </div>
            )}

            {/* Description */}
            <div className="mb-3">
              <label className="form-label fw-bold text-muted mb-1" style={{ fontSize: '0.72rem' }}>Description / Notes</label>
              <textarea
                className="form-control form-control-sm"
                rows="2"
                placeholder="Provide details or agenda..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ fontSize: '0.80rem', padding: '8px 12px' }}
              />
            </div>

            <div className="d-flex justify-content-end gap-2 pt-2.5 border-top">
              <button
                type="button"
                className="btn btn-light btn-sm fw-semibold px-3 py-1.5"
                onClick={() => setShowAddModal(false)}
                style={{ fontSize: '0.78rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm fw-bold px-3 py-1.5 shadow-sm erp-btn-hover"
                disabled={submitting}
                style={{ backgroundColor: ERP.primary, borderColor: ERP.primary, fontSize: '0.78rem' }}
              >
                {submitting ? 'Saving...' : 'Publish Entry'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Details View Modal */}
        {viewModal.event && (
          <Modal
            show={viewModal.show}
            title="Schedule Item Details"
            onClose={() => setViewModal({ show: false, event: null })}
          >
            {(() => {
              const ev = viewModal.event;
              const meta = getEventMeta(ev.eventType, ev.customClassification);

              return (
                <div className="p-1 p-md-2">
                  <div
                    className="p-3 rounded-3 mb-3 d-flex align-items-center justify-content-between"
                    style={{ backgroundColor: meta.bg, border: `1px solid ${meta.border}` }}
                  >
                    <div className="text-truncate me-2">
                      <h6 className="fw-bold mb-1 text-dark text-truncate" style={{ fontSize: '0.90rem' }}>
                        {ev.title}
                      </h6>
                      <span
                        className="badge fw-bold"
                        style={{ backgroundColor: meta.color, color: '#fff', fontSize: '0.64rem' }}
                      >
                        {meta.icon} {ev.customClassification || meta.label}
                      </span>
                    </div>
                    <span
                      className="badge bg-white shadow-sm fw-bold text-dark flex-shrink-0"
                      style={{ fontSize: '0.66rem', border: `1px solid ${ERP.border}`, padding: '5px 8px' }}
                    >
                      {getDaysDiffNotice(ev.startDate)}
                    </span>
                  </div>

                  <div className="row g-2.5 mb-2">
                    <div className="col-6">
                      <small className="text-muted text-uppercase fw-bold d-block" style={{ fontSize: '0.62rem' }}>From</small>
                      <span className="fw-semibold small text-dark" style={{ fontSize: '0.78rem' }}>
                        {ev.startDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    <div className="col-6">
                      <small className="text-muted text-uppercase fw-bold d-block" style={{ fontSize: '0.62rem' }}>To</small>
                      <span className="fw-semibold small text-dark" style={{ fontSize: '0.78rem' }}>
                        {ev.endDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    <div className="col-12 mt-1">
                      <small className="text-muted text-uppercase fw-bold d-block" style={{ fontSize: '0.62rem' }}>Coverage</small>
                      <span className="badge bg-light text-dark border fw-semibold me-1" style={{ fontSize: '0.70rem' }}>
                        {ev.daySpan === 'multiple' ? 'Multiple Days' : 'Single Day'}
                      </span>
                      <span className="badge bg-light text-dark border fw-semibold" style={{ fontSize: '0.70rem' }}>
                        {ev.dayType === 'half' ? `Half Day (${ev.halfDaySession || 'First Half'})` : 'Full Day'}
                      </span>
                    </div>

                    {ev.eventType === 'Holiday' && ev.holidayCategory && (
                      <div className="col-12 mt-1">
                        <small className="text-muted text-uppercase fw-bold d-block" style={{ fontSize: '0.62rem' }}>Category</small>
                        <span className="badge bg-light text-dark border fw-semibold" style={{ fontSize: '0.70rem' }}>
                          🌴 {ev.holidayCategory}
                        </span>
                      </div>
                    )}

                    {ev.eventType === 'Meeting' && ev.meetingLocation && (
                      <div className="col-12 mt-1">
                        <small className="text-muted text-uppercase fw-bold d-block" style={{ fontSize: '0.62rem' }}>Location / Link</small>
                        <span className="small text-primary fw-semibold" style={{ fontSize: '0.76rem', wordBreak: 'break-all' }}>
                          📍 {ev.meetingLocation}
                        </span>
                      </div>
                    )}

                    {ev.description && (
                      <div className="col-12 mt-2">
                        <small className="text-muted text-uppercase fw-bold d-block mb-1" style={{ fontSize: '0.62rem' }}>Description</small>
                        <p className="p-2.5 rounded-2 small text-dark bg-light border mb-0" style={{ fontSize: '0.76rem' }}>
                          {ev.description}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="d-flex justify-content-end gap-2 pt-2.5 border-top">
                    {canDelete && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm fw-bold px-3 py-1.5 erp-btn-hover"
                        style={{ fontSize: '0.76rem' }}
                        onClick={() => handleDelete(ev._id)}
                      >
                        Delete
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-light btn-sm fw-semibold px-3 py-1.5 erp-btn-hover"
                      style={{ fontSize: '0.76rem' }}
                      onClick={() => setViewModal({ show: false, event: null })}
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            })()}
          </Modal>
        )}
      </div>
    </>
  );
};

export default CalendarMainPage;