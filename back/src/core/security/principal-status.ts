import { prisma } from '../../config/prisma';
import { AppError } from '../errors/app-error';
import type { AuthenticatedUser } from '../interfaces/global.interfaces';

const CACHE_TTL_MS = 30_000;

interface PrincipalStatus {
  isActive: boolean;
  passwordChangedAtSec: number | null;
  expiresAt: number;
}

const cache = new Map<string, PrincipalStatus>();

export const principalCacheKey = (kind: 'user' | 'student', id: string): string =>
  kind === 'user' ? `u:${id}` : `s:${id}`;

/** Invalida el estado cacheado (llamar tras desactivar, cambiar rol o cambiar contraseña). */
export const invalidatePrincipalCache = (kind: 'user' | 'student', id: string): void => {
  cache.delete(principalCacheKey(kind, id));
};

const loadStatus = async (principal: AuthenticatedUser): Promise<PrincipalStatus> => {
  if (principal.role === 'STUDENT') {
    const student = await prisma.student.findUnique({
      where: { id: principal.studentId ?? principal.userId },
      select: { id: true, passwordChangedAt: true },
    });
    return {
      isActive: Boolean(student),
      passwordChangedAtSec: student?.passwordChangedAt ? Math.floor(student.passwordChangedAt.getTime() / 1000) : null,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: principal.userId },
    select: { isActive: true, passwordChangedAt: true },
  });
  return {
    isActive: Boolean(user?.isActive),
    passwordChangedAtSec: user?.passwordChangedAt ? Math.floor(user.passwordChangedAt.getTime() / 1000) : null,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
};

/** Lanza 401 si la cuenta fue desactivada o si el token es anterior al último cambio de contraseña. */
export const assertPrincipalIsActive = async (principal: AuthenticatedUser & { iat?: number }): Promise<void> => {
  const key =
    principal.role === 'STUDENT'
      ? principalCacheKey('student', principal.studentId ?? principal.userId)
      : principalCacheKey('user', principal.userId);

  let status = cache.get(key);
  if (!status || status.expiresAt < Date.now()) {
    status = await loadStatus(principal);
    cache.set(key, status);
  }

  if (!status.isActive) {
    throw new AppError('Tu cuenta está desactivada o ya no existe. Contacta al administrador.', 401);
  }

  if (principal.iat && status.passwordChangedAtSec && principal.iat < status.passwordChangedAtSec) {
    throw new AppError('Tu sesión expiró porque la contraseña fue cambiada. Inicia sesión nuevamente.', 401);
  }
};
