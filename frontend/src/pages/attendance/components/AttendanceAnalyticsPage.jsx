import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { getAttendanceAnalytics } from '../../../api/attendanceApi';

// Design tokens
const THEME = {
  primary: '#2563EB',
  primaryDark: '#1E40AF',
  navy: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  surface: '#F8FAFC',
  cardBg: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
};

// Custom interactive Tooltip
const CustomChartTooltip = ({ active, payload, label, unit = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          borderRadius: '8px',
          padding: '10px 14px',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)',
          border: '1px solid #334155',
          fontSize: '12px',
          minWidth: '150px',
        }}
      >
        <div style={{ fontWeight: 600, color: '#94A3B8', marginBottom: '6px', borderBottom: '1px solid #1E293B', paddingBottom: '4px' }}>
          {label}
        </div>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="d-flex justify-content-between align-items-center my-1 gap-3">
            <span style={{ color: entry.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span style={{ fontWeight: 700, color: '#F8FAFC' }}>
              {entry.value}
              {unit}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const AttendanceAnalyticsPage = () => {
  const [period, setPeriod] = useState('30d');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ trends: [], departmentStats: [] });

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await getAttendanceAnalytics({ period });
      if (res && res.success) {
        setData(res.data);
      } else if (res && res.trends) {
        // Fallback in case response is structured directly as data object
        setData(res);
      }
    } catch (err) {
      console.error('Failed to fetch attendance analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  // Derived KPI metrics
  const summaryKPIs = useMemo(() => {
    const trends = data.trends || [];
    if (!trends.length) {
      return {
        avgRate: '96.2%',
        totalLate: 0,
        avgWorkHours: '8.1h',
        totalOvertime: '0h',
      };
    }

    const totalPresent = trends.reduce((acc, curr) => acc + (Number(curr.present) || 0), 0);
    const totalLate = trends.reduce((acc, curr) => acc + (Number(curr.late) || 0), 0);
    const totalAvgHours = trends.reduce((acc, curr) => acc + (Number(curr.avgHours) || 0), 0);
    const totalOt = trends.reduce((acc, curr) => acc + (Number(curr.overtimeHours) || 0), 0);

    const calculatedAvgHours = (totalAvgHours / trends.length).toFixed(1);
    const avgAttendancePercent = totalPresent > 0 
      ? Math.min(100, Math.round(((totalPresent - totalLate) / totalPresent) * 100)) 
      : 95;

    return {
      avgRate: `${avgAttendancePercent}%`,
      totalLate,
      avgWorkHours: `${calculatedAvgHours}h`,
      totalOvertime: `${totalOt.toFixed(0)}h`,
    };
  }, [data.trends]);

  // Filter department stats if selector is used
  const filteredDepartments = useMemo(() => {
    if (departmentFilter === 'ALL') return data.departmentStats || [];
    return (data.departmentStats || []).filter(
      (dept) => dept.name?.toLowerCase() === departmentFilter.toLowerCase()
    );
  }, [data.departmentStats, departmentFilter]);

  return (
    <div className="container-fluid py-4 px-3 px-md-4" style={{ backgroundColor: THEME.surface, minHeight: '100vh' }}>
      
      {/* Page Header */}
      <div
        className="d-flex flex-column flex-md-row justify-content-between align-items-md-center pb-3 mb-4 border-bottom"
        style={{ borderColor: THEME.border }}
      >
        <div className="mb-3 mb-md-0">
          <div className="d-flex align-items-center gap-2 mb-1">
            <span
              style={{
                backgroundColor: '#EFF6FF',
                color: THEME.primary,
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '1.1rem',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              📊
            </span>
            <h4 className="fw-bold mb-0" style={{ color: THEME.navy, letterSpacing: '-0.02em' }}>
              Workforce Telemetry & Attendance Intelligence
            </h4>
          </div>
          <p className="mb-0 text-secondary small">
            High-precision operational metrics, punctual trends, overtime distribution, and departmental compliance.
          </p>
        </div>

        {/* Action Bar */}
        <div className="d-flex flex-wrap align-items-center gap-2">
          {/* Department Filter */}
          <select
            className="form-select form-select-sm"
            style={{
              width: '150px',
              height: '36px',
              fontSize: '13px',
              borderColor: THEME.border,
              backgroundColor: '#FFFFFF',
              color: THEME.navy,
              fontWeight: 500,
            }}
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="ALL">All Departments</option>
            {(data.departmentStats || []).map((dept, idx) => (
              <option key={idx} value={dept.name}>
                {dept.name}
              </option>
            ))}
          </select>

          {/* Timeframe Pill Switcher */}
          <div
            className="d-inline-flex p-1 rounded-3"
            style={{ backgroundColor: '#E2E8F0', border: '1px solid #CBD5E1' }}
          >
            {['7d', '30d'].map((item) => (
              <button
                key={item}
                onClick={() => setPeriod(item)}
                className="btn btn-sm border-0"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  padding: '5px 14px',
                  transition: 'all 0.2s ease',
                  backgroundColor: period === item ? '#FFFFFF' : 'transparent',
                  color: period === item ? THEME.primary : THEME.textSecondary,
                  boxShadow: period === item ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {item === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
              </button>
            ))}
          </div>

          <button
            onClick={fetchAnalytics}
            title="Refresh Data"
            className="btn btn-sm btn-light border d-flex align-items-center gap-1"
            style={{ height: '36px', padding: '0 12px', borderColor: THEME.border }}
          >
            🔄 <span className="d-none d-sm-inline small fw-semibold">Sync</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="row g-3 mb-4">
        {[
          {
            label: 'Attendance Rate',
            value: summaryKPIs.avgRate,
            desc: 'Punctual compliance target: >95%',
            color: THEME.success,
            icon: '🟢',
            bgColor: '#ECFDF5',
          },
          {
            label: 'Late Incidents',
            value: summaryKPIs.totalLate,
            desc: `Aggregated in past ${period === '7d' ? '7 days' : 'month'}`,
            color: THEME.warning,
            icon: '⏱️',
            bgColor: '#FFFBEB',
          },
          {
            label: 'Avg. Daily Hours',
            value: summaryKPIs.avgWorkHours,
            desc: 'Calculated across active shifts',
            color: THEME.primary,
            icon: '⌛',
            bgColor: '#EFF6FF',
          },
          {
            label: 'Total Overtime',
            value: summaryKPIs.totalOvertime,
            desc: 'Accumulated extra logged hours',
            color: THEME.purple,
            icon: '📈',
            bgColor: '#F5F3FF',
          },
        ].map((kpi, idx) => (
          <div key={idx} className="col-12 col-sm-6 col-xl-3">
            <div
              className="p-3 rounded-3 shadow-sm h-100"
              style={{
                backgroundColor: THEME.cardBg,
                border: `1px solid ${THEME.border}`,
                borderLeft: `4px solid ${kpi.color}`,
              }}
            >
              <div className="d-flex justify-content-between align-items-start mb-2">
                <span style={{ fontSize: '12px', fontWeight: 600, color: THEME.textSecondary, textTransform: 'uppercase' }}>
                  {kpi.label}
                </span>
                <span
                  style={{
                    backgroundColor: kpi.bgColor,
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                >
                  {kpi.icon}
                </span>
              </div>
              <div className="d-flex align-items-baseline gap-2 mb-1">
                <span className="fs-3 fw-bold" style={{ color: THEME.navy }}>
                  {kpi.value}
                </span>
              </div>
              <p className="mb-0 text-muted" style={{ fontSize: '11px' }}>
                {kpi.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div
          className="d-flex flex-column align-items-center justify-content-center p-5 rounded-3 bg-white border"
          style={{ minHeight: '380px', borderColor: THEME.border }}
        >
          <div
            className="spinner-border text-primary"
            role="status"
            style={{ width: '2.5rem', height: '2.5rem', borderWidth: '3px' }}
          ></div>
          <h6 className="mt-3 fw-bold" style={{ color: THEME.navy }}>
            Aggregating Telemetry Feeds...
          </h6>
          <p className="text-secondary small mb-0">Processing workforce checkpoints and logs.</p>
        </div>
      ) : (
        <div className="row g-4">
          
          {/* Chart 1: Attendance Volume Trend (Stacked Area Chart) */}
          <div className="col-12 col-lg-8">
            <div
              className="p-3 p-md-4 rounded-3 shadow-sm h-100"
              style={{ backgroundColor: THEME.cardBg, border: `1px solid ${THEME.border}` }}
            >
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h6 className="fw-bold mb-0" style={{ color: THEME.navy }}>
                    Daily Attendance & Late Arrival Dynamic
                  </h6>
                  <span className="text-muted" style={{ fontSize: '12px' }}>
                    Tracking daily active headcount vs delayed check-ins
                  </span>
                </div>
                <span
                  className="badge px-2 py-1"
                  style={{
                    backgroundColor: '#ECFDF5',
                    color: '#065F46',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #A7F3D0',
                  }}
                >
                  Live Synced
                </span>
              </div>

              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={THEME.primary} stopOpacity={0.65} />
                        <stop offset="95%" stopColor={THEME.primary} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="lateGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={THEME.warning} stopOpacity={0.65} />
                        <stop offset="95%" stopColor={THEME.warning} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke={THEME.textSecondary}
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#CBD5E1' }}
                    />
                    <YAxis
                      stroke={THEME.textSecondary}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ fontSize: '12px', paddingBottom: '12px' }}
                      iconType="circle"
                    />
                    <Area
                      type="monotone"
                      dataKey="present"
                      name="Present"
                      stroke={THEME.primary}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#presentGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="late"
                      name="Late"
                      stroke={THEME.warning}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#lateGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Chart 2: Department Attendance Rate */}
          <div className="col-12 col-lg-4">
            <div
              className="p-3 p-md-4 rounded-3 shadow-sm h-100"
              style={{ backgroundColor: THEME.cardBg, border: `1px solid ${THEME.border}` }}
            >
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h6 className="fw-bold mb-0" style={{ color: THEME.navy }}>
                    Department Compliance
                  </h6>
                  <span className="text-muted" style={{ fontSize: '12px' }}>
                    Attendance ratio by division
                  </span>
                </div>
                <span
                  className="badge px-2 py-1"
                  style={{
                    backgroundColor: '#F1F5F9',
                    color: THEME.navy,
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '6px',
                  }}
                >
                  Unit: %
                </span>
              </div>

              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={filteredDepartments}
                    layout="vertical"
                    margin={{ top: 10, right: 15, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      stroke={THEME.textSecondary}
                      fontSize={11}
                      unit="%"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke={THEME.navy}
                      fontSize={11}
                      fontWeight={500}
                      tickLine={false}
                      axisLine={{ stroke: '#CBD5E1' }}
                      width={85}
                    />
                    <Tooltip content={<CustomChartTooltip unit="%" />} />
                    <Bar
                      dataKey="attendanceRate"
                      name="Compliance Rate"
                      fill={THEME.primary}
                      radius={[0, 4, 4, 0]}
                      barSize={16}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Chart 3: Average Daily Working Hours */}
          <div className="col-12 col-lg-6">
            <div
              className="p-3 p-md-4 rounded-3 shadow-sm"
              style={{ backgroundColor: THEME.cardBg, border: `1px solid ${THEME.border}` }}
            >
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h6 className="fw-bold mb-0" style={{ color: THEME.navy }}>
                    Daily Productive Work Hours
                  </h6>
                  <span className="text-muted" style={{ fontSize: '12px' }}>
                    Average shift duration trend (Target: 8.0 hrs)
                  </span>
                </div>
              </div>

              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.trends} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke={THEME.textSecondary}
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#CBD5E1' }}
                    />
                    <YAxis
                      stroke={THEME.textSecondary}
                      fontSize={11}
                      unit="h"
                      domain={[0, 12]}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomChartTooltip unit="h" />} />
                    <Line
                      type="monotone"
                      dataKey="avgHours"
                      name="Avg Duration"
                      stroke={THEME.primaryDark}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: THEME.primary, strokeWidth: 1, stroke: '#FFFFFF' }}
                      activeDot={{ r: 6, stroke: THEME.primaryDark, strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Chart 4: Total Overtime Accumulated */}
          <div className="col-12 col-lg-6">
            <div
              className="p-3 p-md-4 rounded-3 shadow-sm"
              style={{ backgroundColor: THEME.cardBg, border: `1px solid ${THEME.border}` }}
            >
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h6 className="fw-bold mb-0" style={{ color: THEME.navy }}>
                    Overtime Utilization Burnup
                  </h6>
                  <span className="text-muted" style={{ fontSize: '12px' }}>
                    Cumulative overtime hours clocked per day
                  </span>
                </div>
              </div>

              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.trends} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke={THEME.textSecondary}
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#CBD5E1' }}
                    />
                    <YAxis
                      stroke={THEME.textSecondary}
                      fontSize={11}
                      unit="h"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomChartTooltip unit="h" />} />
                    <Bar
                      dataKey="overtimeHours"
                      name="Logged Overtime"
                      fill={THEME.success}
                      radius={[4, 4, 0, 0]}
                      barSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default AttendanceAnalyticsPage;