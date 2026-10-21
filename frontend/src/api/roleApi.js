import axiosClient from './axiosClient';

export const roleApi = {
  getRoles: () => axiosClient.get('/roles'),
  getRoleById: (id) => axiosClient.get(`/roles/${id}`),
  createRole: (roleData) => axiosClient.post('/roles', roleData),
  updateRole: (id, roleData) => axiosClient.put(`/roles/${id}`, roleData),
  deleteRole: (id) => axiosClient.delete(`/roles/${id}`),
};
