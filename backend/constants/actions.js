const ACTIONS = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  EXPORT: 'export',
  IMPORT: 'import',
  ASSIGN: 'assign',
  APPROVE: 'approve',
  REJECT: 'reject',
  CLOSE: 'close',
  REOPEN: 'reopen',
};

const ALL_ACTIONS = Object.values(ACTIONS);

module.exports = {
  ACTIONS,
  ALL_ACTIONS,
};
