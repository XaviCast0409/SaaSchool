import { prisma } from '../../config/prisma';

/**
 * Estado del colegio que necesita cada petición (activo y vencimiento del plan), con caché en memoria.
 * Antes el tenant middleware consultaba la tabla School en CADA petición; con 5 conexiones a la BD eso
 * competía con las consultas reales. Se invalida al suspender, reactivar o cambiar el plan.
 */
export interface SchoolStatus {
  id: string;
  isActive: boolean;
  planExpiresAt: Date | null;
}

const TTL_MS = 30_000;
const cache = new Map<string, { value: SchoolStatus | null; expiresAt: number }>();

export async function getSchoolStatus(schoolId: string): Promise<SchoolStatus | null> {
  const hit = cache.get(schoolId);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const value = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, isActive: true, planExpiresAt: true },
  });
  cache.set(schoolId, { value, expiresAt: Date.now() + TTL_MS });
  if (cache.size > 5_000) {
    const now = Date.now();
    for (const [key, entry] of cache) if (entry.expiresAt <= now) cache.delete(key);
  }
  return value;
}

/** Llamar tras cambiar isActive o planExpiresAt de un colegio. */
export function invalidateSchoolStatus(schoolId: string): void {
  cache.delete(schoolId);
}

/** Solo para tests. */
export function __resetSchoolStatusCache(): void {
  cache.clear();
}
