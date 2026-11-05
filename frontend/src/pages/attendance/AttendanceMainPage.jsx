import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Users,
  Clock,
  Settings,
  Calendar,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../hooks/useAuth';
import { getAttendanceSummaryKPIs } from '../../api/attendanceApi';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import MyAttendancePage from './MyAttendancePage';
import AttendanceListPage from './AttendanceListPage';
import TeamAttendanceRosterView from './components/TeamAttendanceRosterView';
import OvertimeManagementPage from './components/OvertimeManagementPage';
import AttendancePolicySettingsPage from './components/AttendancePolicySettingsPage';

const AttendanceMainPage = () => {
  const { can } = usePermission();
  const { isSuperAdmin } = useAuth();

  const canViewTeam = isSuperAdmin || can('attendance', 'view') || can('dashboard', 'view');
  const canApprove = isSuperAdmin || can('attendance', 'approve');
  const canManagePolicies = isSuperAdmin || can('attendance', 'edit');

  const [activeTab, setActiveTab] = useState(canViewTeam ? 'team' : 'my');
  const [teamViewMode, setTeamViewMode] = useState('roster');

  const [kpiData, setKpiData] = useState({});
  const [kpiLoading, setKpiLoading] = useState(false);

  const fetchKPIs = useCallback(async () => {
    setKpiLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await getAttendanceSummaryKPIs({ date: todayStr });
      if (res && res.success && res.data) {
        setKpiData({
          ...res.data,
          totalEmployees: res.data.totalEmployees ?? 0,
          present: res.data.present ?? res.data.presentToday ?? 0,
          absent: res.data.absent ?? res.data.absentToday ?? 0,
          late: res.data.late ?? res.data.lateArrivals ?? 0,
        });
      }
    } catch (err) {
      console.error('Error fetching attendance summary KPIs:', err);
    } finally {
      setKpiLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKPIs();
  }, [fetchKPIs]);

  const navTabs = [
    { id: 'my', label: 'My Attendance', icon: User, visible: true },
    { id: 'team', label: 'Team Attendance', icon: Users, visible: canViewTeam },
    { id: 'overtime', label: 'Overtime Approvals', icon: Clock, visible: canApprove },
    { id: 'settings', label: 'Shift Policies', icon: Settings, visible: canManagePolicies },
  ];

  return (
    <div className="erp-fade-in pb-4">
      {/* ── Page Header ── */}
      <PageHeader
        title="Employee Attendance & Shift Telemetry"
        subtitle="Manage real-time biometric and GPS clock records, shift enforcement, overtime requests, and audit approvals"
        breadcrumbs={[{ label: 'Operations' }, { label: 'Attendance' }]}
      />

      {/* ── Top Summary KPIs ── */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Total Workforce"
            value={kpiData.totalEmployees ?? 0}
            subtitle="Scheduled shift workforce"
            icon={Users}
            variant="primary"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Present Staff"
            value={kpiData.present ?? 0}
            subtitle={`${kpiData.late ?? 0} marked late`}
            icon={User}
            variant="success"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Absent Today"
            value={kpiData.absent ?? 0}
            subtitle="No punch registered"
            icon={AlertTriangle}
            variant="danger"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Pending Overtime"
            value={kpiData.pendingOvertimeRequests ?? kpiData.pendingRequests ?? 0}
            subtitle="Awaiting administrative approval"
            icon={Clock}
            variant="warning"
          />
        </div>
      </div>

      {/* ── Modular Tab Navigation ── */}
      <div className="erp-tabs-nav mb-4">
        {navTabs
          .filter((t) => t.visible)
          .map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                className={`erp-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
      </div>

      {/* ── Active Tab Viewport ── */}
      <div className="erp-fade-in">
        {activeTab === 'my' && <MyAttendancePage onPunchUpdated={fetchKPIs} hideHeader={true} />}
        {activeTab === 'team' && (
          <div>
            <div className="d-flex justify-content-end mb-2.5">
              <div className="btn-group p-0.5 rounded-3 bg-white border shadow-xs" role="group">
                <button
                  type="button"
                  className={`btn btn-sm px-3 py-1.5 fw-semibold rounded-2 ${
                    teamViewMode === 'roster' ? 'btn-primary shadow-xs' : 'btn-ghost text-muted border-0'
                  }`}
                  onClick={() => setTeamViewMode('roster')}
                  style={{ fontSize: '0.78rem' }}
                >
                  <Users size={14} className="me-1.5" />
                  Quick Console
                </button>
                <button
                  type="button"
                  className={`btn btn-sm px-3 py-1.5 fw-semibold rounded-2 ${
                    teamViewMode === 'table' ? 'btn-primary shadow-xs' : 'btn-ghost text-muted border-0'
                  }`}
                  onClick={() => setTeamViewMode('table')}
                  style={{ fontSize: '0.78rem' }}
                >
                  <FileSpreadsheet size={14} className="me-1.5" />
                  Records Table
                </button>
              </div>
            </div>

            {teamViewMode === 'roster' ? (
              <TeamAttendanceRosterView />
            ) : (
              <AttendanceListPage hideHeader={true} />
            )}
          </div>
        )}
        {activeTab === 'overtime' && <OvertimeManagementPage />}
        {activeTab === 'settings' && <AttendancePolicySettingsPage />}
      </div>
    </div>
  );
};

export default AttendanceMainPage;
