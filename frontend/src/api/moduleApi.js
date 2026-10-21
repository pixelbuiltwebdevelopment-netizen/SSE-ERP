import axiosClient from './axiosClient';

export const moduleApi = {
  getModules: () => axiosClient.get('/modules'),
  createModule: (data) => axiosClient.post('/modules', data),
  updateModule: (id, data) => axiosClient.put(`/modules/${id}`, data),
  updateModuleStatus: (id, isActive) => axiosClient.patch(`/modules/${id}/status`, { isActive }),
};
