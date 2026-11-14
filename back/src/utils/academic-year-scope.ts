import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

/**
 * Año académico que el personal eligió en el selector de la cabecera (encabezado
 * `X-Academic-Year-Id`). Solo se acepta si pertenece al colegio de quien consulta; si no llega o
 * no es válido, devuelve undefined y cada consulta usa el año vigente como siempre.
 */
const YEAR_KEY = Symbol('academicYearScope');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function selectedAcademicYearId(request: Request): Promise<string | undefined> {
  const cache = request as Request & { [YEAR_KEY]?: string | null };
  if (cache[YEAR_KEY] !== undefined) return cache[YEAR_KEY] ?? undefined;
  const raw = request.header('x-academic-year-id');
  let result: string | null = null;
  if (raw && UUID.test(raw) && request.user?.schoolId) {
    const year = await prisma.academicYear.findFirst({ where: { id: raw, schoolId: request.user.schoolId }, select: { id: true } });
    result = year?.id ?? null;
  }
  cache[YEAR_KEY] = result;
  return result ?? undefined;
}

/**
 * Matrículas "del año": las registradas del año elegido o, sin año elegido, las vigentes
 * (isActive = año vigente y registrada). Mismo significado en ambos casos.
 */
export function enrollmentsOfYear(academicYearId?: string): Prisma.EnrollmentWhereInput {
  return academicYearId ? { academicYearId, enrollmentState: 'REGISTERED' } : { isActive: true };
}
