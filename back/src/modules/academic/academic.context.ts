import type { AcademicYear, EducationLevel } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { thresholdsFromGradingScale, type LetterScaleThresholds } from '../grades/letter-scale';
import { CNEB_AREAS, CNEB_COMPETENCES } from './cneb.catalog';

export interface AcademicUser {
  userId: string;
  role: string;
  schoolId: string;
  studentId?: string;
}

export const isAdmin = (u: { role: string }) => u.role === 'SCHOOL_ADMIN' || u.role === 'SUPER_ADMIN';

export async function getActiveYear(schoolId: string): Promise<AcademicYear> {
  const year = await prisma.academicYear.findFirst({ where: { schoolId, isActive: true }, orderBy: { year: 'desc' } });
  if (!year) throw new AppError('No hay un año lectivo activo. Actívalo en Configuración > Años lectivos.', 409);
  return year;
}

export async function resolveYear(schoolId: string, academicYearId?: string | null): Promise<AcademicYear> {
  if (!academicYearId) return getActiveYear(schoolId);
  const year = await prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId } });
  if (!year) throw new AppError('Año lectivo no encontrado.', 404);
  return year;
}

export const periodCount = (year: { periodType: string }) => (year.periodType === 'TRIMESTER' ? 3 : 4);

export function assertPeriod(year: { periodType: string }, periodNumber: number): void {
  if (!Number.isInteger(periodNumber) || periodNumber < 1 || periodNumber > periodCount(year)) {
    throw new AppError('Periodo no válido para este año lectivo.', 400);
  }
}

export function periodName(year: { periodType: string; periodsConfig: unknown }, n: number): string {
  const cfg = Array.isArray(year.periodsConfig) ? (year.periodsConfig as Array<{ periodNumber: number; name?: string }>) : [];
  const found = cfg.find((p) => Number(p.periodNumber) === n);
  if (found?.name) return found.name;
  return `${n}.° ${year.periodType === 'TRIMESTER' ? 'trimestre' : 'bimestre'}`;
}

const thresholdCache = new Map<string, { value: LetterScaleThresholds; expiresAt: number }>();

export async function getThresholds(schoolId: string, level: EducationLevel): Promise<LetterScaleThresholds> {
  const key = `${schoolId}:${level}`;
  const hit = thresholdCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const rows = await prisma.gradingScale.findMany({ where: { schoolId, level }, select: { letterGrade: true, minNumeric: true } });
  const value = thresholdsFromGradingScale(rows);
  thresholdCache.set(key, { value, expiresAt: Date.now() + 60_000 });
  return value;
}

export function clearThresholds(schoolId: string): void {
  for (const key of thresholdCache.keys()) if (key.startsWith(`${schoolId}:`)) thresholdCache.delete(key);
}

/** Ordena competencias según el orden oficial del área (orden de columnas del SIAGIE). Talleres al final. */
export function sortCompetences<T extends { cnebNumber: number | null; name: string }>(
  level: EducationLevel,
  officialAreaCode: string | null,
  competences: T[],
): T[] {
  const order = CNEB_AREAS[level].find((a) => a.code === officialAreaCode)?.competences ?? [];
  const idx = (c: T) => (c.cnebNumber !== null && order.includes(c.cnebNumber) ? order.indexOf(c.cnebNumber) : 999);
  return [...competences].sort((a, b) => idx(a) - idx(b) || a.name.localeCompare(b.name, 'es'));
}

export const shortNameOf = (c: { cnebNumber: number | null; name: string }) =>
  c.cnebNumber ? CNEB_COMPETENCES[c.cnebNumber]?.shortName ?? c.name : c.name;

export const fullNameOf = (s: { lastNamePaternal: string; lastNameMaternal?: string | null; firstNames: string }) =>
  `${`${s.lastNamePaternal} ${s.lastNameMaternal ?? ''}`.trim()}, ${s.firstNames}`;

/** Carga una asignación vigente validando colegio y propiedad del docente. */
export async function loadAssignmentForUser(
  schoolId: string,
  user: AcademicUser,
  assignmentId: string,
  opts: { write?: boolean } = {},
) {
  if (!['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'].includes(user.role)) {
    throw new AppError('No tienes permiso para ver este curso.', 403);
  }
  if (opts.write && user.role === 'ADMINISTRATIVE') {
    throw new AppError('No tienes permiso para registrar notas.', 403);
  }
  const assignment = await prisma.courseAssignment.findFirst({
    where: { id: assignmentId, schoolId, deletedAt: null },
    include: {
      classroom: { select: { id: true, educationLevel: true, grade: true, section: true, tutorTeacherId: true } },
      area: { include: { competences: { where: { isActive: true } } } },
      teacher: { select: { id: true, firstName: true, lastNamePaternal: true, lastNameMaternal: true } },
      academicYear: true,
    },
  });
  if (!assignment || !assignment.academicYear || !assignment.academicYearId) throw new AppError('Curso no encontrado.', 404);
  if (user.role === 'TEACHER' && assignment.teacherId !== user.userId) {
    throw new AppError('Este curso no está asignado a ti.', 403);
  }
  return assignment as typeof assignment & { academicYear: AcademicYear; academicYearId: string };
}
