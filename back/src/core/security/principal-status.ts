import { prisma } from '../../config/prisma';
import { AppError } from '../errors/app-error';
import type { AuthenticatedUser } from '../interfaces/global.interfaces';

const CACHE_TTL_MS = 30_000;

interface PrincipalStatus {
  isActive: boolean;
  /** Motivo de la desactivación (para un mensaje claro al usuario). */
  inactiveReason?: 'DISABLED' | 'WITHDRAWN';
  passwordChangedAtSec: number | null;
  /** Rol y colegio vigentes en BD: si difieren de los del token, la sesión deja de valer. */
  role: string | null;
  schoolId: string | null;
  expiresAt: number;
}

const cache = new Map<string, PrincipalStatus>();

export const principalCacheKey = (kind: 'user' | 'student', id: string): string =>
  kind === 'user' ? `u:${id}` : `s:${id}`;

/** Invalida el estado cacheado (llamar tras desactivar, cambiar rol o cambiar contraseña). */
export const invalidatePrincipalCache = (kind: 'user' | 'student', id: string): void => {
  cache.delete(principalCacheKey(kind, id));
};

const LEAVING_STATES = new Set(['WITHDRAWN', 'TRANSFERRED']);

/**
 * Un alumno pierde el acceso cuando su matrícula más reciente está retirada o trasladada.
 * Si se le reincorpora o se le matricula en un año posterior, lo recupera solo.
 * Un alumno sin matrícula (recién registrado) conserva el acceso.
 */
export const isStudentWithdrawn = async (studentId: string): Promise<boolean> => {
  const latest = await prisma.enrollment.findFirst({
    where: { studentId },
    orderBy: [{ academicYear: { startDate: 'desc' } }, { enrollmentDate: 'desc' }],
    select: { enrollmentState: true },
  });
  return Boolean(latest && LEAVING_STATES.has(latest.enrollmentState));
};

const toSec = (date: Date | null | undefined): number | null =>
  date ? Math.floor(date.getTime() / 1000) : null;

const loadStatus = async (principal: AuthenticatedUser): Promise<PrincipalStatus> => {
  if (principal.role === 'STUDENT') {
    const studentId = principal.studentId ?? principal.userId;
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, schoolId: true, passwordChangedAt: true },
    });
    const withdrawn = student ? await isStudentWithdrawn(student.id) : false;
    return {
      isActive: Boolean(student) && !withdrawn,
      inactiveReason: withdrawn ? 'WITHDRAWN' : 'DISABLED',
      passwordChangedAtSec: toSec(student?.passwordChangedAt),
      role: student ? 'STUDENT' : null,
      schoolId: student?.schoolId ?? null,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: principal.userId },
    select: { isActive: true, passwordChangedAt: true, role: true, schoolId: true },
  });
  return {
    isActive: Boolean(user?.isActive),
    inactiveReason: 'DISABLED',
    passwordChangedAtSec: toSec(user?.passwordChangedAt),
    role: user?.role ?? null,
    schoolId: user?.schoolId ?? null,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
};

/**
 * Lanza 401 si la cuenta fue desactivada, si el alumno fue retirado o trasladado,
 * si su rol o colegio cambiaron después de emitir el token, o si el token es anterior
 * al último cambio de contraseña.
 */
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
    if (status.inactiveReason === 'WITHDRAWN') {
      throw new AppError('Tu matrícula figura como retirada o trasladada, por eso tu acceso fue cerrado. Comunícate con Secretaría.', 401);
    }
    throw new AppError('Tu cuenta está desactivada o ya no existe. Contacta al administrador.', 401);
  }

  if (status.role !== principal.role || (status.schoolId ?? null) !== (principal.schoolId ?? null)) {
    throw new AppError('Tus permisos cambiaron. Inicia sesión nuevamente.', 401);
  }

  if (principal.iat && status.passwordChangedAtSec && principal.iat < status.passwordChangedAtSec) {
    throw new AppError('Tu sesión expiró porque la contraseña fue cambiada. Inicia sesión nuevamente.', 401);
  }
};
