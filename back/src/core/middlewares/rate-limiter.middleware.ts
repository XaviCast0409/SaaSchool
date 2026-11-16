import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';
import { verifyToken } from '../../utils/jwt.util';

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ipKey = (request: Request): string => `ip:${ipKeyGenerator(request.ip ?? '')}`;

/**
 * Usuario del token SOLO si la firma es válida. Antes se usaba jwt.decode (sin verificar): con un token
 * falsificado alguien podía agotar el cupo de otro usuario (dejarlo con 429) o saltarse el límite
 * inventando ids. Un token inválido o vencido cuenta contra la IP.
 */
export const verifiedUserKey = (request: Request): string | null => {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const { userId } = verifyToken(header.slice(7).trim());
    return userId ?? null;
  } catch {
    return null;
  }
};

/** Login: 10 intentos por IP + identificador cada 15 min (no bloquea a todo un colegio que comparte IP). */
export const loginRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  // Solo cuentan los intentos fallidos: entrar bien varias veces (equipo compartido) no bloquea
  skipSuccessfulRequests: true,
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

/** Límite para olvido de contraseña: 5 solicitudes por hora por IP (P1). */
export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: ipKey,
  message: { status: 'fail', message: 'Demasiadas solicitudes de recuperación de contraseña. Intenta nuevamente en 1 hora.' },
});

/** API autenticada: 600 peticiones por usuario cada 15 min. */
export const apiRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (request) => request.path.startsWith('/attendance/scan'),
  keyGenerator: (request) => {
    const userId = verifiedUserKey(request);
    return userId ? `u:${userId}` : ipKey(request);
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

/** Página de ingreso de cada colegio (sin sesión): todo un colegio puede abrirla desde la misma red. */
export const loginPageRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 2000,
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
    const userId = verifiedUserKey(request);
    return userId ? `scan:${userId}` : `scan:${ipKey(request)}`;
  },
  message: { status: 'fail', message: 'Demasiados escaneos en poco tiempo. Espera unos segundos.' },
});

/** Formularios públicos (admisión, Libro de Reclamaciones): pocos envíos por IP para frenar spam. */
export const publicFormRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (request) => `form:${ipKey(request)}`,
  message: { status: 'fail', message: 'Recibimos varios envíos desde esta red. Intenta nuevamente en una hora.' },
});
