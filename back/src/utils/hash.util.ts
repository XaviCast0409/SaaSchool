import bcrypt from 'bcryptjs';
import { env } from '../config/env';

/**
 * Genera el hash seguro de una contraseña en texto plano.
 */
export const hashPassword = async (plainPassword: string): Promise<string> => {
  return bcrypt.hash(plainPassword, env.BCRYPT_ROUNDS);
};

/**
 * Compara una contraseña en texto plano con su hash almacenado.
 * Retorna true si coinciden, false en caso contrario.
 */
export const comparePassword = async (
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> => {
  return bcrypt.compare(plainPassword, hashedPassword);
};
