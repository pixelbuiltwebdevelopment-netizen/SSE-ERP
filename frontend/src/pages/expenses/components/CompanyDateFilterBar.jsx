import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Filter,
  RotateCcw,
  Check,
  ChevronDown,
  Clock,
  SlidersHorizontal,
} from 'lucide-react';

export const PRESET_OPTIONS = [
  { id: 'all_time', label: 'All Time (No Filter)' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this_week', label: 'This Week' },
  { id: 'last_week', label: 'Last Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'last_3_months', label: 'Last 3 Months' },
  { id: 'last_6_months', label: 'Last 6 Months' },
  { id: 'this_quarter', label: 'This Quarter' },
  { id: 'this_year', label: 'This Year' },
  { id: 'last_year', label: 'Last Year' },
  { id: 'month_year', label: 'Select Month & Year' },
  { id: 'custom', label: 'Custom Date Range' },
];

export const MONTHS = [
  { value: 0, label: 'January' },
  { value: 1, label: 'February' },
  { value: 2, label: 'March' },
  { value: 3, label: 'April' },
  { value: 4, label: 'May' },
  { value: 5, label: 'June' },
  { value: 6, label: 'July' },
  { value: 7, label: 'August' },
  { value: 8, label: 'September' },
  { value: 9, label: 'October' },
  { value: 10, label: 'November' },
  { value: 11, label: 'December' },
];

export const computeDateRange = (presetId, customParams = {}) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const formatDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayStr}`;
  };

  switch (presetId) {
    case 'all_time':
      return { startDate: '', endDate: '', label: 'All Time' };

    case 'today': {
      const todayStr = formatDate(now);
      return { startDate: todayStr, endDate: todayStr, label: 'Today' };
    }

    case 'yesterday': {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = formatDate(yest);
      return { startDate: yestStr, endDate: yestStr, label: 'Yesterday' };
    }

    case 'this_week': {
      const d = new Date(now);
      const dayOfWeek = d.getDay();
      const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const mon = new Date(d);
      mon.setDate(d.getDate() + diffToMon);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return {
        startDate: formatDate(mon),
        endDate: formatDate(sun),
        label: `This Week (${formatDate(mon)} to ${formatDate(sun)})`,
      };
    }

    case 'last_week': {
      const d = new Date(now);
      const dayOfWeek = d.getDay();
      const diffToMon = dayOfWeek === 0 ? -13 : 1 - dayOfWeek - 7;
      const mon = new Date(d);
      mon.setDate(d.getDate() + diffToMon);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return {
        startDate: formatDate(mon),
        endDate: formatDate(sun),
        label: `Last Week (${formatDate(mon)} to ${formatDate(sun)})`,
      };
    }

    case 'this_month': {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const monthName = firstDay.toLocaleString('en-IN', { month: 'long' });
      return {
        startDate: formatDate(firstDay),
        endDate: formatDate(lastDay),
        label: `This Month (${monthName} ${year})`,
      };
    }

    case 'last_month': {
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      const monthName = firstDay.toLocaleString('en-IN', { month: 'long' });
      return {
        startDate: formatDate(firstDay),
        endDate: formatDate(lastDay),
        label: `Last Month (${monthName} ${firstDay.getFullYear()})`,
      };
    }

    case 'last_3_months': {
      const firstDay = new Date(year, month - 2, 1);
      const lastDay = new Date(year, month + 1, 0);
      return {
        startDate: formatDate(firstDay),
        endDate: formatDate(lastDay),
        label: `Last 3 Months (${formatDate(firstDay)} to ${formatDate(lastDay)})`,
      };
    }

    case 'last_6_months': {
      const firstDay = new Date(year, month - 5, 1);
      const lastDay = new Date(year, month + 1, 0);
      return {
        startDate: formatDate(firstDay),
        endDate: formatDate(lastDay),
        label: `Last 6 Months (${formatDate(firstDay)} to ${formatDate(lastDay)})`,
      };
    }

    case 'this_quarter': {
      const quarterIndex = Math.floor(month / 3);
      const firstDay = new Date(year, quarterIndex * 3, 1);
      const lastDay = new Date(year, (quarterIndex + 1) * 3, 0);
      return {
        startDate: formatDate(firstDay),
        endDate: formatDate(lastDay),
        label: `This Quarter (Q${quarterIndex + 1} ${year})`,
      };
    }

    case 'this_year': {
      const firstDay = new Date(year, 0, 1);
      const lastDay = new Date(year, 11, 31);
      return {
        startDate: formatDate(firstDay),
        endDate: formatDate(lastDay),
        label: `This Year (${year})`,
      };
    }

    case 'last_year': {
      const firstDay = new Date(year - 1, 0, 1);
      const lastDay = new Date(year - 1, 11, 31);
      return {
        startDate: formatDate(firstDay),
        endDate: formatDate(lastDay),
        label: `Last Year (${year - 1})`,
      };
    }

    case 'month_year': {
      const selYear = Number(customParams.year || year);
      const selMonth = Number(customParams.month !== undefined ? customParams.month : month);
      const firstDay = new Date(selYear, selMonth, 1);
      const lastDay = new Date(selYear, selMonth + 1, 0);
      const monthName = firstDay.toLocaleString('en-IN', { month: 'long' });
      return {
        startDate: formatDate(firstDay),
        endDate: formatDate(lastDay),
        label: `${monthName} ${selYear}`,
      };
    }

    case 'custom': {
      const s = customParams.startDate || formatDate(new Date(year, month, 1));
      const e = customParams.endDate || formatDate(now);
      return {
        startDate: s,
        endDate: e,
        label: `Custom (${s} to ${e})`,
      };
    }

    default:
      return { startDate: '', endDate: '', label: 'All Time' };
  }
};

const CompanyDateFilterBar = ({
  onFilterChange,
  onReset,
  activeFilter,
  activeLabel,
  loading = false,
  className = '',
  title = 'Company-Wide Reporting Period Filter',
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // Local state before clicking Apply
  const [selectedPreset, setSelectedPreset] = useState(activeFilter?.preset || 'all_time');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [customStart, setCustomStart] = useState(activeFilter?.startDate || '');
  const [customEnd, setCustomEnd] = useState(activeFilter?.endDate || '');

  // Keep in sync with incoming activeFilter
  useEffect(() => {
    if (activeFilter?.preset && activeFilter.preset !== selectedPreset) {
      setSelectedPreset(activeFilter.preset);
    }
    if (activeFilter?.startDate) setCustomStart(activeFilter.startDate);
    if (activeFilter?.endDate) setCustomEnd(activeFilter.endDate);
  }, [activeFilter?.preset, activeFilter?.startDate, activeFilter?.endDate]);

  // Generate Year list from (currentYear - 4) to (currentYear + 1)
  const years = useMemo(() => {
    const list = [];
    for (let y = currentYear + 1; y >= currentYear - 4; y--) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  // Month input value format: YYYY-MM
  const monthInputValue = useMemo(() => {
    const mStr = String(selectedMonth + 1).padStart(2, '0');
    return `${selectedYear}-${mStr}`;
  }, [selectedYear, selectedMonth]);

  const handleMonthInputChange = (e) => {
    const val = e.target.value; // "YYYY-MM"
    if (!val) return;
    const [y, m] = val.split('-');
    const newY = parseInt(y, 10);
    const newM = parseInt(m, 10) - 1;
    setSelectedYear(newY);
    setSelectedMonth(newM);
    setSelectedPreset('month_year');

    // Automatically apply or update preview
    const r = computeDateRange('month_year', { month: newM, year: newY });
    if (onFilterChange) {
      onFilterChange({
        preset: 'month_year',
        startDate: r.startDate,
        endDate: r.endDate,
        label: r.label,
      });
    }
  };

  // Compute live preview range
  const currentPreview = useMemo(() => {
    return computeDateRange(selectedPreset, {
      month: selectedMonth,
      year: selectedYear,
      startDate: customStart,
      endDate: customEnd,
    });
  }, [selectedPreset, selectedMonth, selectedYear, customStart, customEnd]);

  const effectiveLabel = activeFilter?.label || activeLabel || currentPreview.label;

  const handleApply = () => {
    const range = computeDateRange(selectedPreset, {
      month: selectedMonth,
      year: selectedYear,
      startDate: customStart,
      endDate: customEnd,
    });

    if (onFilterChange) {
      onFilterChange({
        preset: selectedPreset,
        startDate: range.startDate,
        endDate: range.endDate,
        label: range.label,
      });
    }
  };

  const handleReset = () => {
    setSelectedPreset('all_time');
    setCustomStart('');
    setCustomEnd('');
    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);

    if (onReset) onReset();
    else if (onFilterChange) {
      onFilterChange({
        preset: 'all_time',
        startDate: '',
        endDate: '',
        label: 'All Time',
      });
    }
  };

  // Quick preset chips for 1-click selection
  const quickChips = [
    { id: 'all_time', label: 'All Time' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'month_year', label: 'Select Specific Month 📅' },
    { id: 'this_week', label: 'This Week' },
    { id: 'this_quarter', label: 'This Quarter' },
    { id: 'this_year', label: 'This Year' },
    { id: 'custom', label: 'Custom Range' },
  ];

  return (
    <div className={`erp-card p-3 mb-4 shadow-sm border ${className}`}>
      {/* ── Header with Title & Active Period Badge ── */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2 pb-2 border-bottom">
        <div className="d-flex align-items-center gap-2">
          <div
            className="rounded-2 p-1.5 d-flex align-items-center justify-content-center text-primary bg-primary-subtle"
            style={{ width: 32, height: 32 }}
          >
            <Calendar size={18} />
          </div>
          <div>
            <span className="fw-bold text-dark fs-6 d-block">
              {title}
            </span>
            <small className="text-muted">
              Filter financial activity across all employees simultaneously
            </small>
          </div>
        </div>

        {/* Current Active Filter Indicator */}
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-primary text-white px-2.5 py-1.5 rounded-pill fs-7 fw-medium shadow-2xs">
            📅 Period: {effectiveLabel}
          </span>
          {effectiveLabel && effectiveLabel !== 'All Time' && effectiveLabel !== 'All Records' && (
            <button
              type="button"
              className="erp-btn erp-btn-secondary erp-btn-sm p-1 px-2 text-danger"
              onClick={handleReset}
              title="Clear Filter"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Quick Filter Chips ── */}
      <div className="d-flex flex-wrap align-items-center gap-1.5 mb-2.5 pt-1">
        <span className="text-muted small fw-semibold me-1">Quick Select:</span>
        {quickChips.map((chip) => {
          const isActive = selectedPreset === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              className={`erp-btn erp-btn-sm py-0.5 px-2.5 rounded-pill transition-all ${
                isActive
                  ? 'erp-btn-primary fw-semibold shadow-2xs'
                  : 'erp-btn-secondary text-secondary'
              }`}
              style={{ fontSize: '11.5px' }}
              onClick={() => {
                setSelectedPreset(chip.id);
                // Immediately apply when clicking quick chips unless it requires input
                if (chip.id !== 'custom') {
                  const r = computeDateRange(chip.id, {
                    month: selectedMonth,
                    year: selectedYear,
                  });
                  if (onFilterChange) {
                    onFilterChange({
                      preset: chip.id,
                      startDate: r.startDate,
                      endDate: r.endDate,
                      label: r.label,
                    });
                  }
                }
              }}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* ── Main Selector Controls Bar ── */}
      <div className="row g-2 align-items-center">
        {/* Preset Dropdown */}
        <div className="col-12 col-md-3">
          <select
            className="erp-select fw-medium"
            value={selectedPreset}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedPreset(val);
              if (val !== 'custom') {
                const r = computeDateRange(val, {
                  month: selectedMonth,
                  year: selectedYear,
                });
                if (onFilterChange) {
                  onFilterChange({
                    preset: val,
                    startDate: r.startDate,
                    endDate: r.endDate,
                    label: r.label,
                  });
                }
              }
            }}
          >
            {PRESET_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic Controls based on preset */}
        {selectedPreset === 'month_year' && (
          <>
            <div className="col-12 col-sm-4 col-md-3">
              <div className="d-flex align-items-center gap-1.5">
                <input
                  type="month"
                  className="erp-input font-monospace fw-semibold"
                  value={monthInputValue}
                  onChange={handleMonthInputChange}
                  title="Pick specific month and year directly"
                />
              </div>
            </div>
            <div className="col-6 col-sm-4 col-md-2">
              <select
                className="erp-select"
                value={selectedMonth}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setSelectedMonth(m);
                  const r = computeDateRange('month_year', { month: m, year: selectedYear });
                  if (onFilterChange) {
                    onFilterChange({
                      preset: 'month_year',
                      startDate: r.startDate,
                      endDate: r.endDate,
                      label: r.label,
                    });
                  }
                }}
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6 col-sm-4 col-md-2">
              <select
                className="erp-select font-monospace"
                value={selectedYear}
                onChange={(e) => {
                  const y = Number(e.target.value);
                  setSelectedYear(y);
                  const r = computeDateRange('month_year', { month: selectedMonth, year: y });
                  if (onFilterChange) {
                    onFilterChange({
                      preset: 'month_year',
                      startDate: r.startDate,
                      endDate: r.endDate,
                      label: r.label,
                    });
                  }
                }}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {selectedPreset === 'custom' && (
          <>
            <div className="col-6 col-md-3">
              <input
                type="date"
                className="erp-input"
                placeholder="Start Date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                title="Start Date"
                required
              />
            </div>
            <div className="col-6 col-md-3">
              <input
                type="date"
                className="erp-input"
                placeholder="End Date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                title="End Date"
                required
              />
            </div>
          </>
        )}

        {/* Read-only range preview for presets */}
        {selectedPreset !== 'month_year' && selectedPreset !== 'custom' && (
          <div className="col-12 col-md-6 text-muted small d-flex align-items-center gap-1.5 px-2">
            {selectedPreset === 'all_time' ? (
              <span>Showing lifetime financial records across all employees</span>
            ) : (
              <span>
                Active Range: <strong className="text-dark font-monospace">{currentPreview.startDate}</strong> to <strong className="text-dark font-monospace">{currentPreview.endDate}</strong>
              </span>
            )}
          </div>
        )}

        {/* Apply & Reset Buttons */}
        <div className="col-12 col-md-auto ms-auto d-flex align-items-center gap-2 justify-content-end">
          <button
            type="button"
            className="erp-btn erp-btn-secondary erp-btn-sm px-3"
            onClick={handleReset}
            disabled={loading}
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
          <button
            type="button"
            className="erp-btn erp-btn-primary erp-btn-sm px-3.5 d-inline-flex align-items-center gap-1.5 shadow-sm"
            onClick={handleApply}
            disabled={loading || (selectedPreset === 'custom' && (!customStart || !customEnd))}
          >
            <Check size={14} />
            <span>Apply Period</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyDateFilterBar;
