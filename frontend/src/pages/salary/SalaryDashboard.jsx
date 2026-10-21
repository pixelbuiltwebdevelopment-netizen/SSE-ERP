import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import AdminSalaryDashboard from './AdminSalaryDashboard';
import EmployeeSalaryPage from './EmployeeSalaryPage';

/**
 * SalaryMainPage
 * Renders AdminSalaryDashboard for users with salary:view_all permission,
 * otherwise renders the employee-facing EmployeeSalaryPage.
 */
const SalaryMainPage = () => {
  const { isSuperAdmin } = useAuth();
  const { can } = usePermission();

  const canViewAll = isSuperAdmin || can('salary', 'view_all');

  if (canViewAll) {
    return <AdminSalaryDashboard />;
  }

  return <EmployeeSalaryPage />;
};

export default SalaryMainPage;
