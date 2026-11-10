import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../../utils/jwt.util';
import { AppError } from '../errors/app-error';
import { assertPrincipalIsActive } from '../security/principal-status';
import type { AuthenticatedUser } from '../interfaces/global.interfaces';

/**
 * Middleware de autenticación: verifica el JWT, que la cuenta siga activa
 * y que el token sea posterior al último cambio de contraseña.
 */
export const authMiddleware = async (request: Request, _response: Response, next: NextFunction): Promise<void> => {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    throw new AppError('Token de acceso requerido', 401);
  }

  const token = authorizationHeader.slice(7).trim();
  if (!token) {
    throw new AppError('Token de acceso inválido', 401);
  }

  const decoded = verifyToken(token) as AuthenticatedUser & { iat?: number };
  await assertPrincipalIsActive(decoded);

  request.user = {
    userId: decoded.userId,
    studentId: decoded.studentId,
    schoolId: decoded.schoolId,
    role: decoded.role,
    email: decoded.email,
  };

  next();
};

/** Autorización por rol. */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.user) {
      throw new AppError('No autenticado', 401);
    }
    if (!allowedRoles.includes(request.user.role)) {
      throw new AppError('No tienes permisos para realizar esta acción.', 403);
    }
    next();
  };
};
