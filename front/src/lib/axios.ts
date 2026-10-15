import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar el Bearer token y header de impersonación automáticamente en cada request
api.interceptors.request.use(
  (config) => {
    const { token, user, impersonatedSchool } = useAuthStore.getState();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (user?.role === 'SUPER_ADMIN' && impersonatedSchool?.id) {
      config.headers['x-school-id'] = impersonatedSchool.id;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar tokens o sesiones invalidadas (401) automáticamente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);
