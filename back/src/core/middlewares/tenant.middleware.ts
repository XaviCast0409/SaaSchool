import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';

import { prisma } from '../../config/prisma';
import {
  getPlanStatus,
  planAllowsWrites,
  PLAN_BLOCKED_MESSAGE,
  PLAN_READ_ONLY_MESSAGE,
} from '../../modules/schools/plan.rules';
import { recordAudit } from '../../utils/audit.util';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Evita llenar la bitácora con la misma lectura repetida (p. ej. una pantalla que refresca). */
const SUPPORT_READ_DEDUPE_MS = 10 * 60_000;
const recentSupportReads = new Map<string, number>();

/**
 * Deja constancia en la bitácora del colegio de cada vez que soporte (SUPER_ADMIN) entra a sus datos:
 * toda escritura y cada lectura distinta (deduplicada por ruta durante 10 min).
 * Así el colegio puede ver qué consultó KIPUX y cuándo.
 */
const recordSupportAccess = (request: Request): void => {
  const method = request.method?.toUpperCase() ?? 'GET';
  const path = (request.originalUrl ?? request.url ?? '').split('?')[0].slice(0, 300);
  const isRead = READ_METHODS.has(method);
  if (isRead) {
    const key = `${request.user!.userId}|${request.user!.schoolId}|${path}`;
    const now = Date.now();
    const last = recentSupportReads.get(key);
    if (last && now - last < SUPPORT_READ_DEDUPE_MS) return;
    recentSupportReads.set(key, now);
    if (recentSupportReads.size > 5_000) {
      for (const [k, t] of recentSupportReads) if (now - t >= SUPPORT_READ_DEDUPE_MS) recentSupportReads.delete(k);
    }
  }
  recordAudit(request, {
    action: isRead ? 'SUPPORT_READ' : 'SUPPORT_WRITE',
    entity: 'SupportAccess',
    after: { method, path },
  });
};

/**
 * Middleware de Tenant.
 * Verifica que req.user contenga un schoolId válido (inyectado por authMiddleware)
 * y que el colegio exista en la base de datos.
 * Garantiza el aislamiento de datos Multi-Tenant y evita errores por sesiones obsoletas tras re-seed.
 *
 * También aplica el vencimiento del plan (ver plan.rules.ts): en solo lectura rechaza
 * cualquier escritura y, ya bloqueado, toda petición. SUPER_ADMIN (soporte) no se limita.
 *
 * IMPORTANTE: Siempre aplicar DESPUÉS de authMiddleware.
 */
export const tenantMiddleware = async (
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> => {
  if (!request.user) {
    throw new AppError('Usuario no autenticado. Aplica authMiddleware primero.', 401);
  }

  // Si el usuario es SUPER_ADMIN y envía un header 'x-school-id', conmutar al colegio de soporte
  const impersonatedSchoolId = request.headers['x-school-id'] as string | undefined;
  if (request.user.role === 'SUPER_ADMIN' && impersonatedSchoolId) {
    request.user.schoolId = impersonatedSchoolId;
  }

  if (!request.user.schoolId) {
    throw new AppError('Contexto de colegio no encontrado. Acceso denegado.', 403);
  }

  // Verificar que el colegio existe en la BD (previene FK violations y sesiones obsoletas)
  const school = await prisma.school.findUnique({
    where: { id: request.user.schoolId },
    select: { id: true, isActive: true, planExpiresAt: true },
  });

  if (!school) {
    throw new AppError('El colegio o la sesión ya no existe en la base de datos. Por favor inicia sesión nuevamente.', 401);
  }

  if (!school.isActive && request.user.role !== 'SUPER_ADMIN') {
    throw new AppError(
      'El acceso de tu colegio está suspendido. Comunícate con la dirección o con soporte de KIPUX.',
      403,
    );
  }

  if (request.user.role === 'SUPER_ADMIN' && impersonatedSchoolId) {
    try {
      recordSupportAccess(request);
    } catch (error) {
      console.error('[Audit] No se pudo registrar el acceso de soporte', error);
    }
  }

  if (request.user.role !== 'SUPER_ADMIN') {
    const { access } = getPlanStatus(school.planExpiresAt);
    if (access === 'BLOCKED') {
      throw new AppError(PLAN_BLOCKED_MESSAGE, 403);
    }
    if (!planAllowsWrites(access) && !READ_METHODS.has(request.method?.toUpperCase() ?? 'GET')) {
      throw new AppError(PLAN_READ_ONLY_MESSAGE, 403);
    }
  }

  next();
};
