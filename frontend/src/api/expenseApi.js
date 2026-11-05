import axiosClient from './axiosClient';

export const expenseApi = {
  // Cloudinary Receipt / Attachment Upload
  uploadReceipt: (formData) =>
    axiosClient.post('/expenses/upload-receipt', formData, {
      headers: {
        'Content-Type': undefined,
      },
    }),

  // Claims
  submitClaim: (data) => axiosClient.post('/expenses/claims', data),
  getClaims: (params) => axiosClient.get('/expenses/claims', { params }),
  getMyClaims: (params) => axiosClient.get('/expenses/claims/my', { params }),
  getClaimById: (id) => axiosClient.get(`/expenses/claims/${id}`),
  approveClaim: (id, data) =>
    axiosClient.patch(`/expenses/claims/${id}/approve`, data || { status: 'Approved' }),
  rejectClaim: (id, rejectionReason) =>
    axiosClient.patch(`/expenses/claims/${id}/reject`, { rejectionReason }),
  settleClaim: (id, data) => axiosClient.post(`/expenses/claims/${id}/settle`, data),

  // Advances & Balances
  getMyBalance: () => axiosClient.get('/expenses/advance/my-balance'),
  issueAdvance: (data) => axiosClient.post('/expenses/advance/issue', data),
  refundAdvance: (data) => axiosClient.post('/expenses/advance/refund', data),
  getAdvanceOverview: (params) => axiosClient.get('/expenses/advance/overview', { params }),
  getAllBalances: () => axiosClient.get('/expenses/advance/all-balances'),

  // Financial Overviews & Statements
  getEmployeeFinancialOverview: (params) =>
    axiosClient.get('/expenses/overview/employee-summary', { params }),
  getCompanyPeriodicReports: (params) =>
    axiosClient.get('/expenses/reports/periodic', { params }),
  getEmployeeStatement: (userId) =>
    axiosClient.get(`/expenses/employee/${userId}/statement`),
  getMyStatement: () => axiosClient.get('/expenses/my/statement'),
};
