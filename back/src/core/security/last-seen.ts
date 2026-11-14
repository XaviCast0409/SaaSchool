import { prisma } from '../../config/prisma';
import type { AuthenticatedUser } from '../interfaces/global.interfaces';

/** Cada cuánto como máximo se escribe la última actividad de una cuenta. */
export const LAST_SEEN_THROTTLE_MS = 15 * 60_000;

const lastWrite = new Map<string, number>();

/**
 * Registra la última actividad de la cuenta (para el panel SuperAdmin) sin frenar la petición:
 * escribe como máximo una vez cada 15 minutos por cuenta y nunca lanza errores.
 * El soporte (SUPER_ADMIN) no cuenta como actividad del colegio.
 */
export function touchLastSeen(principal: AuthenticatedUser, now: number = Date.now()): void {
  if (principal.role === 'SUPER_ADMIN') return;

  const isStudent = principal.role === 'STUDENT';
  const id = isStudent ? (principal.studentId ?? principal.userId) : principal.userId;
  if (!id) return;

  const key = `${isStudent ? 's' : 'u'}:${id}`;
  const previous = lastWrite.get(key);
  if (previous !== undefined && now - previous < LAST_SEEN_THROTTLE_MS) return;
  lastWrite.set(key, now);

  const data = { lastSeenAt: new Date(now) };
  const write = isStudent
    ? prisma.student.updateMany({ where: { id }, data })
    : prisma.user.updateMany({ where: { id }, data });
  void write.catch(() => lastWrite.delete(key));
}
