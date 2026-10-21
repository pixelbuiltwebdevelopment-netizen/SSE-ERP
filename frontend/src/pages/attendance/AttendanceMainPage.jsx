import React, { useState, useEffect, useCallback } from 'react';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../hooks/useAuth';
import { getAttendanceSummaryKPIs } from '../../api/attendanceApi';
import AttendancePeriodSelector from './components/AttendancePeriodSelector';
import AttendanceSummaryCards from './components/AttendanceSummaryCards';
import MyAttendancePage from './MyAttendancePage';
import AttendanceListPage from './AttendanceListPage';
import MissingPunchOutsPage from './components/MissingPunchOutsPage';
import OvertimeManagementPage from './components/OvertimeManagementPage';
import AttendanceCorrectionsPage from './components/AttendanceCorrectionsPage';
import AttendancePolicySettingsPage from './components/AttendancePolicySettingsPage';
import AttendanceAnalyticsPage from './components/AttendanceAnalyticsPage';

// Design Tokens
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

const AttendanceMainPage = () => {
  const { can } = usePermission();
  const { isSuperAdmin } = useAuth();

  // Permissions
  const canViewTeam = can('attendance', 'view') || isSuperAdmin;
  const canApprove = can('attendance', 'approve') || isSuperAdmin;
  const canManagePolicies = can('attendance', 'edit') || isSuperAdmin;

  // Active Tab
  const [activeTab, setActiveTab] = useState('my');

  // Period Selector State
  const [activePeriod, setActivePeriod] = useState('today');
  const [customRange, setCustomRange] = useState({ startDate: '', endDate: '' });

  // Summary KPI State
  const [kpiData, setKpiData] = useState({});
  const [kpiLoading, setKpiLoading] = useState(false);

  // Helper to compute ISO date strings for periods
  const computeDateRangeForPeriod = useCallback((period, custom) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    switch (period) {
      case 'today':
        return { date: todayStr };
      case 'yesterday': {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        return { date: y.toISOString().split('T')[0] };
      }
      case 'week': {
        const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1));
        const lastDayOfWeek = new Date();
        return {
          startDate: firstDayOfWeek.toISOString().split('T')[0],
          endDate: lastDayOfWeek.toISOString().split('T')[0],
        };
      }
      case 'month': {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          startDate: start.toISOString().split('T')[0],
          endDate: todayStr,
        };
      }
      case 'prev_month': {
        const startPrev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endPrev = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
          startDate: startPrev.toISOString().split('T')[0],
          endDate: endPrev.toISOString().split('T')[0],
        };
      }
      case 'custom':
        return {
          startDate: custom.startDate || undefined,
          endDate: custom.endDate || undefined,
        };
      default:
        return { date: todayStr };
    }
  }, []);

  // Fetch Summary Cards based on active period
  const fetchKPIs = useCallback(async () => {
    setKpiLoading(true);
    try {
      const queryParams = computeDateRangeForPeriod(activePeriod, customRange);
      const res = await getAttendanceSummaryKPIs(queryParams);
      if (res && res.success) {
        setKpiData(res.data);
      }
    } catch (err) {
      console.error('Error fetching attendance summary KPIs:', err);
    } finally {
      setKpiLoading(false);
    }
  }, [activePeriod, customRange, computeDateRangeForPeriod]);

  useEffect(() => {
    fetchKPIs();
  }, [fetchKPIs]);

  const activeDateRangeFilter = computeDateRangeForPeriod(activePeriod, customRange);

  // Nav Items Configuration with icons and condition flags
  const navTabs = [
    { id: 'my', label: 'My Attendance', icon: '👤', visible: true },
    { id: 'team', label: 'Team Attendance', icon: '👥', visible: canViewTeam },
    { id: 'missing', label: 'Review Queue', icon: '⚠️', visible: canViewTeam },
    { id: 'overtime', label: 'Overtime', icon: '⏱️', visible: canApprove },
    { id: 'corrections', label: 'Corrections', icon: '📝', visible: canApprove },
    { id: 'analytics', label: 'Analytics', icon: '📈', visible: canViewTeam },
    { id: 'settings', label: 'Shift Policies', icon: '⚙️', visible: canManagePolicies },
  ];

  return (
    <div
      className="container-fluid py-3 px-2 px-md-4"
      style={{
        backgroundColor: THEME.surface,
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        /* Smooth tab animation */
        @keyframes subtleFadeUp {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .tab-content-panel {
          animation: subtleFadeUp 0.22s ease-out forwards;
        }

        /* Hide scrollbars for the tabs navigation on mobile */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Main Header Banner */}
      <div
        className="rounded-3 p-3 p-md-4 mb-4 shadow-sm"
        style={{
          backgroundColor: THEME.cardBg,
          border: `1px solid ${THEME.border}`,
        }}
      >
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span
                style={{
                  backgroundColor: THEME.primaryLight,
                  color: THEME.primary,
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontSize: '1.2rem',
                }}
              >
                📅
              </span>
              <h3 className="fw-bold mb-0" style={{ color: THEME.navy, letterSpacing: '-0.02em' }}>
                Smart Attendance & Shift Telemetry
              </h3>
            </div>
            <p className="text-secondary small mb-0 ms-1">
              Real-time biometric punch logs, shift compliance, overtime approvals, and audit trails.
            </p>
          </div>

          <div className="d-flex align-items-center gap-2 align-self-stretch align-self-lg-auto justify-content-between justify-content-lg-end">
            <span
              className="badge px-3 py-2 rounded-pill d-inline-flex align-items-center gap-1.5"
              style={{
                backgroundColor: '#ECFDF5',
                color: '#065F46',
                border: '1px solid #A7F3D0',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  display: 'inline-block',
                }}
              />
              System Active
            </span>
            <button
              onClick={fetchKPIs}
              disabled={kpiLoading}
              className="btn btn-sm btn-light border d-inline-flex align-items-center gap-1.5"
              style={{ height: '34px', fontSize: '12px', borderColor: THEME.border }}
              title="Refresh KPIs"
            >
              <span style={{ display: 'inline-block', transform: kpiLoading ? 'rotate(180deg)' : 'none', transition: '0.4s' }}>
                🔄
              </span>
              <span className="fw-semibold text-secondary">Sync</span>
            </button>
          </div>
        </div>

        {/* Mobile-Responsive Horizontal Tabs */}
        <div className="mt-3 pt-3 border-top" style={{ borderColor: '#F1F5F9' }}>
          <div
            className="d-flex align-items-center gap-1 no-scrollbar"
            style={{
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              paddingBottom: '4px',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {navTabs
              .filter((tab) => tab.visible)
              .map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="btn btn-sm border-0 d-inline-flex align-items-center gap-1.5"
                    style={{
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 500,
                      backgroundColor: isActive ? THEME.primary : 'transparent',
                      color: isActive ? '#FFFFFF' : THEME.textSecondary,
                      boxShadow: isActive ? '0 4px 10px rgba(37, 99, 235, 0.25)' : 'none',
                      transition: 'all 0.18s ease-in-out',
                      flexShrink: 0,
                    }}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* Period Selection Controls */}
      <div className="mb-3">
        <AttendancePeriodSelector
          activePeriod={activePeriod}
          onSelectPeriod={setActivePeriod}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
          loading={kpiLoading}
        />
      </div>

      {/* 10 Dashboard Summary KPI Cards Strip */}
      <div className="mb-4">
        <AttendanceSummaryCards data={kpiData} loading={kpiLoading} />
      </div>

      {/* Active Tab Panel Content */}
      <div className="tab-content-panel">
        {activeTab === 'my' && <MyAttendancePage hideHeader={true} />}

        {activeTab === 'team' && canViewTeam && (
          <AttendanceListPage hideHeader={true} dateRangeFilter={activeDateRangeFilter} />
        )}

        {activeTab === 'missing' && canViewTeam && <MissingPunchOutsPage />}

        {activeTab === 'overtime' && canApprove && <OvertimeManagementPage />}

        {activeTab === 'corrections' && canApprove && <AttendanceCorrectionsPage />}

        {activeTab === 'analytics' && canViewTeam && <AttendanceAnalyticsPage />}

        {activeTab === 'settings' && canManagePolicies && <AttendancePolicySettingsPage />}
      </div>
    </div>
  );
};

export default AttendanceMainPage;