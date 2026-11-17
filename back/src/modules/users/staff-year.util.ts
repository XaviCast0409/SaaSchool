import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

type Db = Prisma.TransactionClient | typeof prisma;

export const STAFF_ROLES = ['SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'] as const;

/**
 * Asigna al año a todo el personal activo que no figura en NINGÚN año.
 *
 * Cubre a quienes nunca pasaron por "Registrar personal": la directora creada junto con el colegio
 * (cuando aún no había año), cuentas del seed o personas a las que se les cambió el rol.
 * Quien ya tiene años registrados no se toca: su contratación se maneja a mano o con "Renovar".
 */
export async function hireStaffWithoutYear(db: Db, schoolId: string, academicYearId: string, userIds?: string[]): Promise<number> {
  const users = await db.user.findMany({
    where: {
      schoolId,
      isActive: true,
      role: { in: [...STAFF_ROLES] },
      staffYears: { none: {} },
      ...(userIds ? { id: { in: userIds } } : {}),
    },
    select: { id: true },
  });
  if (users.length === 0) return 0;
  const result = await db.staffYear.createMany({
    data: users.map((u) => ({ schoolId, userId: u.id, academicYearId })),
    skipDuplicates: true,
  });
  return result.count;
}
