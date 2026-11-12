import { prisma } from '../../config/prisma';
import type { Recipient } from './delivery';

/**
 * Apoderados activos por alumno.
 * Con `financialOnly`, prioriza al responsable de pagos; si ningún familiar está marcado
 * como tal, usa al apoderado legal y, en último caso, a todos los familiares.
 */
export async function guardiansByStudent(
  studentIds: string[],
  options: { financialOnly?: boolean } = {},
): Promise<Map<string, Recipient[]>> {
  const map = new Map<string, Recipient[]>();
  if (studentIds.length === 0) return map;

  const relations = await prisma.familyRelationship.findMany({
    where: { studentId: { in: studentIds }, user: { isActive: true } },
    select: {
      studentId: true,
      isFinancialResponsible: true,
      isLegalGuardian: true,
      user: { select: { id: true, email: true } },
    },
  });

  const grouped = new Map<string, typeof relations>();
  for (const r of relations) {
    if (!grouped.has(r.studentId)) grouped.set(r.studentId, []);
    grouped.get(r.studentId)!.push(r);
  }

  for (const [studentId, rels] of grouped) {
    let chosen = rels;
    if (options.financialOnly) {
      const financial = rels.filter((r) => r.isFinancialResponsible);
      const legal = rels.filter((r) => r.isLegalGuardian);
      chosen = financial.length > 0 ? financial : legal.length > 0 ? legal : rels;
    }
    map.set(
      studentId,
      chosen.map((r) => ({ userId: r.user.id, email: r.user.email })),
    );
  }
  return map;
}

export function studentShortName(s: { firstNames: string; lastNamePaternal: string }): string {
  return `${s.firstNames.split(' ')[0]} ${s.lastNamePaternal}`;
}

export function classroomLabel(c: { grade: number; section: string; educationLevel: string }): string {
  const level = c.educationLevel === 'INITIAL' ? 'Inicial' : c.educationLevel === 'PRIMARY' ? 'Primaria' : 'Secundaria';
  return c.educationLevel === 'INITIAL' ? `${c.grade} años ${c.section} (${level})` : `${c.grade}.° ${c.section} de ${level}`;
}
