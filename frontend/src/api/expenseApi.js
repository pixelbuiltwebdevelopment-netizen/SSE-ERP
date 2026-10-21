import axiosClient from './axiosClient';

export const expenseApi = {
  // ✅ FIX: Do NOT hardcode 'multipart/form-data', use undefined so browser sets the boundary automatically
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
  approveClaim: (id) => axiosClient.patch(`/expenses/claims/${id}/approve`, { status: 'Approved' }),
  rejectClaim: (id, rejectionReason) => axiosClient.patch(`/expenses/claims/${id}/reject`, { rejectionReason }),

  // Advances
  getMyBalance: () => axiosClient.get('/expenses/advance/my-balance'),
  issueAdvance: (data) => axiosClient.post('/expenses/advance/issue', data),
  getAllBalances: () => axiosClient.get('/expenses/advance/all-balances'),
};