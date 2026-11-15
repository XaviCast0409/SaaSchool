import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { useAcademicYearStore, YEAR_SCOPED_ROLES } from '../store/useAcademicYearStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
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
    // Año elegido en el selector de la cabecera (solo personal; sin elegir = año vigente)
    const { selectedYearId } = useAcademicYearStore.getState();
    // Una petición puede pedir otro año explícitamente (p. ej. aulas del año destino al matricular)
    if (selectedYearId && user && YEAR_SCOPED_ROLES.includes(user.role) && !config.headers['x-academic-year-id']) {
      config.headers['x-academic-year-id'] = selectedYearId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar tokens o sesiones invalidadas (401) o colegios suspendidos (403) automáticamente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || '';

    // Colegio suspendido: 403 con mensaje de suspensión
    const isSuspension =
      status === 403 &&
      typeof message === 'string' &&
      message.toLowerCase().includes('suspendido');

    if (isSuspension) {
      useAuthStore.getState().logout();
      sessionStorage.setItem('suspension_message', message);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?suspendido=1';
      }
      return Promise.reject(error);
    }

    // Un 401 del propio login es "credenciales inválidas": se muestra en el formulario, sin redirigir
    const isLoginRequest = String(error.config?.url ?? '').endsWith('/auth/login');
    if (status === 401 && !isLoginRequest) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);
