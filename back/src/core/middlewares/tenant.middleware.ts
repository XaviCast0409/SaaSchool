import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';

import { prisma } from '../../config/prisma';

/**
 * Middleware de Tenant.
 * Verifica que req.user contenga un schoolId válido (inyectado por authMiddleware)
 * y que el colegio exista en la base de datos.
 * Garantiza el aislamiento de datos Multi-Tenant y evita errores por sesiones obsoletas tras re-seed.
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
    select: { id: true, isActive: true },
  });

  if (!school || !school.isActive) {
    throw new AppError('El colegio o la sesión ya no existe en la base de datos. Por favor inicia sesión nuevamente.', 401);
  }

  next();
};
