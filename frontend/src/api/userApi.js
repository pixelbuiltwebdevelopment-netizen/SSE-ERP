import axiosClient from './axiosClient';

export const userApi = {
  getUsers: (params) => axiosClient.get('/users', { params }),
  getUserById: (id) => axiosClient.get(`/users/${id}`),
  createUser: (userData) => axiosClient.post('/users', userData),
  updateUser: (id, userData) => axiosClient.put(`/users/${id}`, userData),
  updateUserStatus: (id, isActive) => axiosClient.patch(`/users/${id}/status`, { isActive }),
  updateUserRole: (id, roleId) => axiosClient.patch(`/users/${id}/role`, { roleId }),
  deleteUser: (id) => axiosClient.delete(`/users/${id}`),
};
