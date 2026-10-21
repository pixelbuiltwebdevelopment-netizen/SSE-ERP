import axiosClient from './axiosClient';

export const leaveApi = {
  submitLeave: (data) => axiosClient.post('/leaves/request', data),
  getLeaves: (params) => axiosClient.get('/leaves/requests', { params }),
  getMyLeaves: (params) => axiosClient.get('/leaves/requests/my', { params }),
  approveLeave: (id) => axiosClient.patch(`/leaves/requests/${id}/approve`, { status: 'Approved' }),
  rejectLeave: (id, rejectionReason) => axiosClient.patch(`/leaves/requests/${id}/reject`, { rejectionReason }),
};
