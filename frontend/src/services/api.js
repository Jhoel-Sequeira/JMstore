import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: apiBaseUrl.replace(/\/$/, ''),
});

export const AUTH_STORAGE_KEY = 'jmstore.session.v1';

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new Event('jmstore-session-expired'));
  }
  return Promise.reject(error);
});

export default api;
