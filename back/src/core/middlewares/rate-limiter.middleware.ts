import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import type { Request } from 'express';

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ipKey = (request: Request): string => `ip:${ipKeyGenerator(request.ip ?? '')}`;

/** Login: 10 intentos por IP + identificador cada 15 min (no bloquea a todo un colegio que comparte IP). */
export const loginRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (request) =>
    `${ipKey(request)}:${String((request.body as { email?: string } | undefined)?.email ?? '').trim().toLowerCase()}`,
  message: { status: 'fail', message: 'Demasiados intentos de inicio de sesión. Intenta nuevamente en 15 minutos.' },
});

/** Tope global de autenticación por IP (protege contra ataques distribuidos por identificador). */
export const authIpRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: ipKey,
  message: { status: 'fail', message: 'Demasiadas solicitudes de autenticación desde esta red. Intenta más tarde.' },
});

/** API autenticada: 600 peticiones por usuario cada 15 min. */
export const apiRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (request) => request.path.startsWith('/attendance/scan'),
  keyGenerator: (request) => {
    const header = request.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const decoded = jwt.decode(header.slice(7)) as { userId?: string } | null;
      if (decoded?.userId) return `u:${decoded.userId}`;
    }
    return ipKey(request);
  },
  message: { status: 'fail', message: 'Límite de peticiones alcanzado. Intenta nuevamente en unos minutos.' },
});

/** Tope por IP contra inundación (una red escolar completa puede compartir IP). */
export const ipFloodRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 5000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: ipKey,
  message: { status: 'fail', message: 'Demasiadas solicitudes desde esta red. Intenta más tarde.' },
});

/** Descarga de archivos firmados (sin token Bearer). */
export const fileContentRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 2000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: ipKey,
  message: { status: 'fail', message: 'Demasiadas descargas desde esta red. Intenta más tarde.' },
});

/** Escáner de asistencia: un portero puede registrar cientos de ingresos en minutos. */
export const scanRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 3000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (request) => {
    const header = request.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const decoded = jwt.decode(header.slice(7)) as { userId?: string } | null;
      if (decoded?.userId) return `scan:${decoded.userId}`;
    }
    return `scan:${ipKey(request)}`;
  },
  message: { status: 'fail', message: 'Demasiados escaneos en poco tiempo. Espera unos segundos.' },
});
