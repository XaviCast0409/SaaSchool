import rateLimit from 'express-rate-limit';

/**
 * Limitador estricto para rutas de Autenticación (Login, Registro)
 * Máximo 10 intentos cada 15 minutos por IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo 10 intentos
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Demasiados intentos de autenticación. Intenta nuevamente en 15 minutos.',
  },
});

/**
 * Limitador general para el API
 * Máximo 300 peticiones cada 15 minutos por IP.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Límite de peticiones alcanzado. Intenta nuevamente más tarde.',
  },
});
