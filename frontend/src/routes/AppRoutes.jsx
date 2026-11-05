import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/common/LoadingSpinner';

import AuthLayout from '../layouts/AuthLayout';
import AdminLayout from '../layouts/AdminLayout';
import ProtectedRoute from './ProtectedRoute';

import LoginPage from '../pages/auth/LoginPage';
import SettingsPage from '../pages/settings/SettingsPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import UserListPage from '../pages/users/UserListPage';
import RoleListPage from '../pages/roles/RoleListPage';
import RoleFormPage from '../pages/roles/RoleFormPage';
import ModuleListPage from '../pages/modules/ModuleListPage';
import AuditLogPage from '../pages/audit/AuditLogPage';
import AccessDeniedPage from '../pages/access-denied/AccessDeniedPage';
import CompanyListPage from '../pages/companies/CompanyListPage';
import CompanyDetailPage from '../pages/companies/CompanyDetailPage';
import CompanyCreatePage from '../pages/companies/CompanyCreatePage';
import CompanyEditPage from '../pages/companies/CompanyEditPage';
import AttendanceMainPage from '../pages/attendance/AttendanceMainPage';
import MyAttendancePage from '../pages/attendance/MyAttendancePage';
import AttendanceListPage from '../pages/attendance/AttendanceListPage';
import ExpenseMainPage from '../pages/expenses/ExpenseMainPage';
import ExpenseSubmitPage from '../pages/expenses/ExpenseSubmitPage';
import AdvanceManagementPage from '../pages/expenses/AdvanceManagementPage';

import LeaveMainPage from '../pages/leaves/LeaveMainPage';
import LeaveSubmitPage from '../pages/leaves/LeaveSubmitPage';

import CalendarMainPage from '../pages/calendar/CalendarMainPage';
import TicketDashboard from '../pages/tickets/TicketDashboard';
import SalaryDashboard from '../pages/salary/SalaryDashboard';

const AppRoutes = () => {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [isDelayed, setIsDelayed] = useState(false);

  const hasToken = Boolean(
    localStorage.getItem('token') || localStorage.getItem('authToken')
  );

  useEffect(() => {
    // Show recovery option only if connection genuinely hangs over 6 seconds
    const timer = setTimeout(() => {
      if (authLoading) setIsDelayed(true);
    }, 6000);

    return () => clearTimeout(timer);
  }, [authLoading]);

  // Show authenticating spinner only when verifying saved token
  if (hasToken && authLoading) {
    return (
      <LoadingSpinner
        text="Authenticating ERP Session"
        subtext={
          isDelayed
            ? 'Authentication is taking longer than expected. Check your network or retry.'
            : 'Verifying cryptographic security token...'
        }
        showRetry={isDelayed}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected Admin Routes (Requires User Login) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/403" element={<AccessDeniedPage />} />

          {/* Module-Guarded Routes */}
          <Route element={<ProtectedRoute module="users" action="view" />}>
            <Route path="/users" element={<UserListPage />} />
          </Route>

          <Route element={<ProtectedRoute module="roles" action="view" />}>
            <Route path="/roles" element={<RoleListPage />} />
            <Route path="/roles/create" element={<RoleFormPage />} />
            <Route path="/roles/:id/edit" element={<RoleFormPage />} />
          </Route>

          <Route element={<ProtectedRoute module="modules" action="view" />}>
            <Route path="/modules" element={<ModuleListPage />} />
          </Route>

          <Route element={<ProtectedRoute module="companies" action="view" />}>
            <Route path="/companies" element={<CompanyListPage />} />
            <Route path="/companies/:id" element={<CompanyDetailPage />} />
          </Route>

          <Route element={<ProtectedRoute module="companies" action="create" />}>
            <Route path="/companies/create" element={<CompanyCreatePage />} />
          </Route>

          <Route element={<ProtectedRoute module="companies" action="edit" />}>
            <Route path="/companies/:id/edit" element={<CompanyEditPage />} />
          </Route>

          {/* Attendance */}
          <Route path="/attendance" element={<AttendanceMainPage />} />
          <Route path="/attendance/my" element={<MyAttendancePage />} />
          <Route path="/attendance/list" element={<AttendanceListPage />} />

          {/* Expenses */}
          <Route path="/expenses" element={<ExpenseMainPage />} />
          <Route element={<ProtectedRoute module="expenses" action="create" />}>
            <Route path="/expenses/submit" element={<ExpenseSubmitPage />} />
          </Route>
          <Route element={<ProtectedRoute module="expenses" action="manage_advance" />}>
            <Route path="/expenses/advances" element={<AdvanceManagementPage />} />
          </Route>

          {/* Leaves */}
          <Route path="/leaves" element={<LeaveMainPage />} />
          <Route path="/leaves/submit" element={<LeaveSubmitPage />} />

          {/* Calendar */}
          <Route element={<ProtectedRoute module="calendar" action="view" />}>
            <Route path="/calendar" element={<CalendarMainPage />} />
          </Route>

          {/* Tickets */}
          <Route element={<ProtectedRoute module="tickets" action="view" />}>
            <Route path="/tickets" element={<TicketDashboard />} />
          </Route>

          {/* Salary */}
          <Route element={<ProtectedRoute module="salary" action="view" />}>
            <Route path="/salary" element={<SalaryDashboard />} />
          </Route>

          <Route element={<ProtectedRoute module="audit-logs" action="view" />}>
            <Route path="/audit-logs" element={<AuditLogPage />} />
          </Route>
        </Route>
      </Route>

      {/* Smart Fallback */}
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
      />
    </Routes>
  );
};

export default AppRoutes;
