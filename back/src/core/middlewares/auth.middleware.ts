import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../../utils/jwt.util';
import { AppError } from '../errors/app-error';
import type { AuthenticatedUser } from '../interfaces/global.interfaces';

/**
 * Middleware de Autenticación.
 * Verifica el JWT del header Authorization y adjunta el payload a req.user.
 * Debe aplicarse ANTES del tenant.middleware en las rutas protegidas.
 */
export const authMiddleware = (
  request: Request,
  _response: Response,
  next: NextFunction,
): void => {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    throw new AppError('Token de acceso requerido', 401);
  }

  const token = authorizationHeader.split(' ')[1];

  if (!token) {
    throw new AppError('Token de acceso inválido', 401);
  }

  const decodedPayload = verifyToken(token);
  request.user = decodedPayload as AuthenticatedUser;

  next();
};

/**
 * Middleware de autorización por rol.
 * Verifica que el usuario autenticado tenga uno de los roles permitidos.
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.user) {
      throw new AppError('No autenticado', 401);
    }

    if (!allowedRoles.includes(request.user.role)) {
      throw new AppError(
        `Acceso denegado. Se requiere uno de los roles: ${allowedRoles.join(', ')}`,
        403,
      );
    }

    next();
  };
};
