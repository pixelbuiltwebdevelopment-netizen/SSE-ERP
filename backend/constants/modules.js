const DEFAULT_MODULES = [
  { 
    name: 'Dashboard', 
    key: 'dashboard', 
    description: 'System Overview and Metrics',
    availableActions: [
      { name: 'View Metrics', key: 'view', requiresScope: true }
    ]
  },
  { 
    name: 'Users', 
    key: 'users', 
    description: 'User Management and Profiles',
    availableActions: [
      { name: 'View Users', key: 'view', requiresScope: true },
      { name: 'Create User', key: 'create', requiresScope: false },
      { name: 'Edit User', key: 'edit', requiresScope: true },
      { name: 'Delete User', key: 'delete', requiresScope: true },
      { name: 'Assign Role', key: 'assign_role', requiresScope: true }
    ]
  },
  { 
    name: 'Roles', 
    key: 'roles', 
    description: 'Role and Permission Management',
    availableActions: [
      { name: 'View Roles', key: 'view', requiresScope: false },
      { name: 'Create Role', key: 'create', requiresScope: false },
      { name: 'Edit Role', key: 'edit', requiresScope: false },
      { name: 'Delete Role', key: 'delete', requiresScope: false }
    ]
  },
  { 
    name: 'Modules', 
    key: 'modules', 
    description: 'System Module Management',
    availableActions: [
      { name: 'View Modules', key: 'view', requiresScope: false }
    ]
  },
  { 
    name: 'Company Profiles', 
    key: 'companies', 
    description: 'Company Profiles and Machine Management',
    availableActions: [
      { name: 'View Companies', key: 'view', requiresScope: true },
      { name: 'Create Company', key: 'create', requiresScope: false },
      { name: 'Edit Company', key: 'edit', requiresScope: true },
      { name: 'Activate/Deactivate', key: 'activate', requiresScope: true },
      { name: 'Delete Company', key: 'delete', requiresScope: true },
      { name: 'Export Data', key: 'export', requiresScope: true }
    ]
  },

  { 
    name: 'Tickets', 
    key: 'tickets', 
    description: 'Field Service and Support Tickets',
    availableActions: [
      { name: 'View Tickets', key: 'view', requiresScope: true },
      { name: 'Create Ticket', key: 'create', requiresScope: false },
      { name: 'Edit Ticket', key: 'edit', requiresScope: true },
      { name: 'Delete Ticket', key: 'delete', requiresScope: true },
      { name: 'Fetch Companies for Ticket', key: 'fetch_companies', requiresScope: false }
    ]
  },
  { 
    name: 'Attendance', 
    key: 'attendance', 
    description: 'Employee Attendance Records',
    availableActions: [
      { name: 'View Team Attendance', key: 'view', requiresScope: true },
      { name: 'Mark/Correct Attendance', key: 'edit', requiresScope: true },
      { name: 'Approve Attendance', key: 'approve', requiresScope: true },
      { name: 'Export Reports', key: 'export', requiresScope: true }
    ]
  },
  { 
    name: 'Expenses', 
    key: 'expenses', 
    description: 'Expense Claims and Advance Ledger',
    availableActions: [
      { name: 'View Expenses', key: 'view', requiresScope: true },
      { name: 'Submit Expense', key: 'create', requiresScope: false },
      { name: 'Approve Expense', key: 'approve', requiresScope: true },
      { name: 'Reject Expense', key: 'reject', requiresScope: true },
      { name: 'Issue Advance', key: 'manage_advance', requiresScope: true }
    ]
  },
  { 
    name: 'Leaves', 
    key: 'leaves', 
    description: 'Leave Requests and Time Off Management',
    availableActions: [
      { name: 'View Leaves', key: 'view', requiresScope: true },
      { name: 'Request Leave', key: 'create', requiresScope: false },
      { name: 'Approve Leave', key: 'approve', requiresScope: true },
      { name: 'Reject Leave', key: 'reject', requiresScope: true }
    ]
  },
  { 
    name: 'Calendar', 
    key: 'calendar', 
    description: 'Company Calendar and Events',
    availableActions: [
      { name: 'View Events', key: 'view', requiresScope: true },
      { name: 'Add Events', key: 'create', requiresScope: false },
      { name: 'Delete Events', key: 'delete', requiresScope: true }
    ]
  },
  { 
    name: 'Salary', 
    key: 'salary', 
    description: 'Salary and Salary Advance Management',
    availableActions: [
      { name: 'View Own Salary & Advances', key: 'view', requiresScope: false },
      { name: 'View All Employees Salary', key: 'view_all', requiresScope: true },
      { name: 'Issue Salary Advance', key: 'issue_advance', requiresScope: true },
      { name: 'Generate / Process Salary', key: 'generate_salary', requiresScope: true }
    ]
  },
  { 
    name: 'Audit Logs', 
    key: 'audit-logs', 
    description: 'System Audit Trails',
    availableActions: [
      { name: 'View Audit Logs', key: 'view', requiresScope: true },
      { name: 'Export Audit Logs', key: 'export', requiresScope: true }
    ]
  },
];

const MODULE_OWNERSHIP_MAP = {
  companies: { createdByField: 'createdBy', assignedToField: 'assignedTo' },
  tickets: { createdByField: 'createdBy' },
  users: { createdByField: 'createdBy' },
  roles: { createdByField: 'createdBy' },
  modules: { createdByField: 'createdBy' },
  attendance: { employeeIdField: 'userId', createdByField: 'createdBy' },
  expenses: { createdByField: 'userId' },
  leaves: { createdByField: 'userId' },
  calendar: { createdByField: 'userId' },
  salary: { createdByField: 'userId' },
  default: { createdByField: 'createdBy', assignedToField: 'assignedTo' },
};

module.exports = {
  DEFAULT_MODULES,
  MODULE_OWNERSHIP_MAP,
};
