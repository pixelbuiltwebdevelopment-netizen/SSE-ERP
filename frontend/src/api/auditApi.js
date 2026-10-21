import axiosClient from './axiosClient';

export const auditApi = {
  getAuditLogs: (params) => axiosClient.get('/audit-logs', { params }),
};
