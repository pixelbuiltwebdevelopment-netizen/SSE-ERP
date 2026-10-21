export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const ACTIONS = [
  'view',
  'create',
  'edit',
  'delete',
  'export',
  'import',
  'assign',
  'approve',
  'reject',
  'close',
  'reopen',
];

export const SCOPES = ['OWN', 'TEAM', 'DEPARTMENT', 'BRANCH', 'ALL'];

export const SCOPE_COLORS = {
  OWN: 'bg-info text-dark',
  TEAM: 'bg-primary text-white',
  DEPARTMENT: 'bg-warning text-dark',
  BRANCH: 'bg-secondary text-white',
  ALL: 'bg-success text-white',
};
