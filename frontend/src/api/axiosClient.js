import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Clear legacy localStorage token if present
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
let accessToken = sessionStorage.getItem('accessToken') || null;
let refreshToken = sessionStorage.getItem('refreshToken') || null;

export const setAccessToken = (token) => {
  accessToken = token;
  if (token) {
    sessionStorage.setItem('accessToken', token);
  } else {
    sessionStorage.removeItem('accessToken');
  }
};

export const getAccessToken = () => {
  return accessToken || sessionStorage.getItem('accessToken');
};

export const setRefreshToken = (token) => {
  refreshToken = token;
  if (token) {
    sessionStorage.setItem('refreshToken', token);
  } else {
    sessionStorage.removeItem('refreshToken');
  }
};

export const getRefreshToken = () => {
  return refreshToken || sessionStorage.getItem('refreshToken');
};

// Request Interceptor: Attach Access Token from sessionStorage
axiosClient.interceptors.request.use(
  (config) => {
    const currentToken = getAccessToken();
    if (currentToken) {
      config.headers.Authorization = `Bearer ${currentToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Concurrency control flags and queue
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Handle Token Refresh on 401 with Queueing
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const currentRefreshToken = getRefreshToken();
        const res = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken: currentRefreshToken },
          { withCredentials: true }
        );

        if (res.data && res.data.data && res.data.data.accessToken) {
          const newToken = res.data.data.accessToken;
          const newRefreshToken = res.data.data.refreshToken;
          
          setAccessToken(newToken);
          if (newRefreshToken) {
            setRefreshToken(newRefreshToken);
          }
          
          axiosClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          originalRequest.headers.Authorization = `Bearer ${newToken}`;

          processQueue(null, newToken);
          isRefreshing = false;

          return axiosClient(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        setAccessToken(null);
        setRefreshToken(null);
        window.location.href = '/login';

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;