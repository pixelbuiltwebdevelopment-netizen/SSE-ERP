import axiosClient, { getRefreshToken } from './axiosClient';

export const authApi = {
  login: (credentials) => axiosClient.post('/auth/login', credentials),
  logout: () => axiosClient.post('/auth/logout', { refreshToken: getRefreshToken() }),
  refresh: () => axiosClient.post('/auth/refresh', { refreshToken: getRefreshToken() }),
  getMe: () => axiosClient.get('/auth/me'),
  changePassword: (data) => axiosClient.post('/auth/change-password', data),
  updateProfile: (data) => axiosClient.put('/auth/profile', data),
};
