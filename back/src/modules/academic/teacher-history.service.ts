import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { getSchoolNow, parseSchoolDate } from '../../utils/timezone.util';
import { dayBefore, teacherLabel, type PeriodRange } from './teacher-history.rules';

type Db = Prisma.TransactionClient | typeof prisma;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Historial de quién dictó cada curso (CourseAssignmentTeacher). */
export class TeacherHistoryService {
  /**
   * Registra que desde `effectiveDate` el curso lo dicta `teacherId`: cierra el tramo abierto el día
   * anterior (o lo descarta si empezaba ese mismo día o después) y abre uno nuevo.
   */
  async recordChange(db: Db, schoolId: string, courseAssignmentId: string, teacherId: string, effectiveDate: string, replacementId?: string | null) {
    const open = await db.courseAssignmentTeacher.findFirst({ where: { courseAssignmentId, toDate: null }, orderBy: { fromDate: 'desc' } });
    if (open && open.teacherId === teacherId) return;
    if (open) {
      if (iso(open.fromDate) >= effectiveDate) await db.courseAssignmentTeacher.delete({ where: { id: open.id } });
      else await db.courseAssignmentTeacher.update({ where: { id: open.id }, data: { toDate: parseSchoolDate(dayBefore(effectiveDate)) } });
    }
    await db.courseAssignmentTeacher.create({
      data: { schoolId, courseAssignmentId, teacherId, fromDate: parseSchoolDate(effectiveDate), replacementId: replacementId ?? null },
    });
  }

  /** El curso queda sin docente (se quita de la carga): cierra el tramo abierto. */
  async close(db: Db, courseAssignmentId: string, date: string) {
    await db.courseAssignmentTeacher.updateMany({ where: { courseAssignmentId, toDate: null }, data: { toDate: parseSchoolDate(dayBefore(date)) } });
  }

  /** Fecha de un cambio hecho hoy, dentro del año (si el año aún no empieza, desde su inicio). */
  effectiveToday(year: { startDate: Date }): string {
    const today = getSchoolNow().dateStr;
    const start = iso(year.startDate);
    return today < start ? start : today;
  }

  /**
   * Nombre del docente de cada curso para actas y libretas: con reemplazos, cada docente con los
   * periodos que le tocaron.
   */
  async labelsFor(
    assignments: Array<{ id: string; teacher: { firstName: string; lastNamePaternal: string } }>,
    year: { periodsConfig: unknown },
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (assignments.length === 0) return result;
    const history = await prisma.courseAssignmentTeacher.findMany({
      where: { courseAssignmentId: { in: assignments.map((a) => a.id) } },
      include: { teacher: { select: { firstName: true, lastNamePaternal: true } } },
    });
    const periods: PeriodRange[] = Array.isArray(year.periodsConfig)
      ? (year.periodsConfig as Array<{ periodNumber: number; startDate: string; endDate: string }>)
          .filter((p) => p.startDate && p.endDate)
          .map((p) => ({ periodNumber: p.periodNumber, startDate: p.startDate.slice(0, 10), endDate: p.endDate.slice(0, 10) }))
      : [];
    for (const a of assignments) {
      const current = `${a.teacher.firstName} ${a.teacher.lastNamePaternal}`.trim();
      const spans = history
        .filter((h) => h.courseAssignmentId === a.id)
        .map((h) => ({ teacherName: `${h.teacher.firstName} ${h.teacher.lastNamePaternal}`.trim(), fromDate: iso(h.fromDate), toDate: h.toDate ? iso(h.toDate) : null }));
      result.set(a.id, teacherLabel(spans, periods, current));
    }
    return result;
  }
}

export const teacherHistoryService = new TeacherHistoryService();
