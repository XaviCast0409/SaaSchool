import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../core/errors/app-error';
import type { AuthenticatedUser } from '../core/interfaces/global.interfaces';

/**
 * Genera un JWT firmado con el payload del usuario autenticado.
 */
export const signToken = (payload: AuthenticatedUser): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
};

/**
 * Verifica y decodifica un JWT.
 * Lanza AppError si el token es inválido o expiró.
 */
export const verifyToken = (token: string): AuthenticatedUser => {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
  } catch (jwtError) {
    if (jwtError instanceof jwt.TokenExpiredError) {
      throw new AppError('El token ha expirado. Por favor inicia sesión nuevamente.', 401);
    }
    throw new AppError('Token inválido o malformado.', 401);
  }
};
