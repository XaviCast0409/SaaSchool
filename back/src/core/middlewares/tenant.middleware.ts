import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';

/**
 * Middleware de Tenant.
 * Verifica que req.user contenga un schoolId válido (inyectado por authMiddleware).
 * Garantiza el aislamiento de datos Multi-Tenant en todas las rutas que lo usen.
 *
 * IMPORTANTE: Siempre aplicar DESPUÉS de authMiddleware.
 */
export const tenantMiddleware = (
  request: Request,
  _response: Response,
  next: NextFunction,
): void => {
  if (!request.user) {
    throw new AppError('Usuario no autenticado. Aplica authMiddleware primero.', 401);
  }

  if (!request.user.schoolId) {
    throw new AppError('Contexto de colegio no encontrado. Acceso denegado.', 403);
  }

  next();
};
