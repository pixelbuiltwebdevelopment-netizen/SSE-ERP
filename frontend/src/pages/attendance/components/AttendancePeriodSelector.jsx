import React, { useRef } from 'react';

const THEME = {
  navy: '#0F172A',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#EFF6FF',
  border: '#E2E8F0',
  surface: '#F8FAFC',
  cardBg: '#FFFFFF',
  textSecondary: '#64748B',
};

const PERIODS = [
  { id: 'today', label: 'Today', icon: 'bi-calendar-day' },
  { id: 'yesterday', label: 'Yesterday', icon: 'bi-calendar-minus' },
  { id: 'week', label: 'This Week', icon: 'bi-calendar-week' },
  { id: 'month', label: 'This Month', icon: 'bi-calendar-month' },
  { id: 'prev_month', label: 'Previous Month', icon: 'bi-calendar2-range' },
  { id: 'custom', label: 'Custom Range', icon: 'bi-sliders' },
];

const AttendancePeriodSelector = ({
  activePeriod,
  onSelectPeriod,
  customRange,
  onCustomRangeChange,
  loading = false,
}) => {
  const scrollRef = useRef(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -220, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 220, behavior: 'smooth' });
    }
  };

  const handleWheel = (e) => {
    if (scrollRef.current && e.deltaY !== 0) {
      e.preventDefault();
      scrollRef.current.scrollBy({ left: e.deltaY, behavior: 'smooth' });
    }
  };

  return (
    <div className="mb-3">
      {/* Scope Label & Desktop Chevrons */}
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="d-flex align-items-center gap-2">
          <span
            className="fw-bold small text-uppercase"
            style={{
              letterSpacing: '0.06em',
              color: THEME.textSecondary,
              fontSize: '11px',
            }}
          >
            Attendance Period Scope
          </span>

          {loading && (
            <div
              className="spinner-border text-primary"
              role="status"
              style={{ width: '12px', height: '12px', borderWidth: '2px' }}
            >
              <span className="visually-hidden">Syncing...</span>
            </div>
          )}
        </div>

        {/* Scroll Chevrons for Desktop / Tablets */}
        <div className="d-none d-sm-flex align-items-center gap-1">
          <button
            type="button"
            className="btn btn-sm btn-light border p-0 d-flex align-items-center justify-content-center"
            onClick={scrollLeft}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              borderColor: THEME.border,
              backgroundColor: '#FFFFFF',
              color: THEME.textSecondary,
              transition: 'all 0.15s ease',
            }}
            title="Scroll left"
          >
            <i className="bi bi-chevron-left" style={{ fontSize: '11px' }}></i>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-light border p-0 d-flex align-items-center justify-content-center"
            onClick={scrollRight}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              borderColor: THEME.border,
              backgroundColor: '#FFFFFF',
              color: THEME.textSecondary,
              transition: 'all 0.15s ease',
            }}
            title="Scroll right"
          >
            <i className="bi bi-chevron-right" style={{ fontSize: '11px' }}></i>
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Pill Bar */}
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="d-flex align-items-center gap-2 pb-1"
        style={{
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          borderBottom: `1px solid ${THEME.border}`,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {PERIODS.map((period) => {
          const isActive = activePeriod === period.id;
          return (
            <button
              key={period.id}
              onClick={() => onSelectPeriod(period.id)}
              className="btn btn-sm border-0 d-inline-flex align-items-center gap-1.5"
              style={{
                borderRadius: '50px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: isActive ? 600 : 500,
                backgroundColor: isActive ? THEME.primary : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#475569',
                border: isActive ? `1px solid ${THEME.primary}` : `1px solid ${THEME.border}`,
                boxShadow: isActive ? '0 2px 8px rgba(37, 99, 235, 0.28)' : '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'all 0.18s ease-in-out',
                flexShrink: 0,
              }}
            >
              <i
                className={`bi ${period.icon}`}
                style={{
                  fontSize: '13px',
                  color: isActive ? '#FFFFFF' : THEME.textSecondary,
                }}
              ></i>
              <span>{period.label}</span>
            </button>
          );
        })}
      </div>

      {/* Custom Date Range Picker Container */}
      {activePeriod === 'custom' && (
        <div
          className="mt-3 p-3 rounded-3 shadow-sm d-flex flex-wrap align-items-center gap-3"
          style={{
            backgroundColor: THEME.cardBg,
            border: `1px solid ${THEME.border}`,
            animation: 'fadeIn 0.2s ease-in-out',
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <span
              className="badge bg-light text-secondary border px-2 py-1"
              style={{ fontSize: '11px', fontWeight: 600 }}
            >
              From
            </span>
            <input
              type="date"
              className="form-control form-control-sm"
              value={customRange.startDate || ''}
              onChange={(e) => onCustomRangeChange({ ...customRange, startDate: e.target.value })}
              style={{
                width: '150px',
                borderColor: '#CBD5E1',
                fontSize: '13px',
                color: THEME.navy,
                borderRadius: '6px',
              }}
            />
          </div>

          <div className="d-flex align-items-center gap-2">
            <span
              className="badge bg-light text-secondary border px-2 py-1"
              style={{ fontSize: '11px', fontWeight: 600 }}
            >
              To
            </span>
            <input
              type="date"
              className="form-control form-control-sm"
              value={customRange.endDate || ''}
              onChange={(e) => onCustomRangeChange({ ...customRange, endDate: e.target.value })}
              style={{
                width: '150px',
                borderColor: '#CBD5E1',
                fontSize: '13px',
                color: THEME.navy,
                borderRadius: '6px',
              }}
            />
          </div>

          {(customRange.startDate || customRange.endDate) && (
            <button
              type="button"
              className="btn btn-sm btn-link text-danger text-decoration-none p-0 ms-auto"
              style={{ fontSize: '12px', fontWeight: 600 }}
              onClick={() => onCustomRangeChange({ startDate: '', endDate: '' })}
            >
              Clear Range
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendancePeriodSelector;