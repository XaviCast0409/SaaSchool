import { prisma } from '../../../config/prisma';
import { escapeHtml } from '../../../utils/notification.util';
import { getPeriodDateRange } from '../../../utils/period-dates.util';
import { periodCount, periodName } from '../../academic/academic.context';
import { addDays, formatLongDate } from '../automation.rules';
import type { AutomationJob, JobContext, JobResult } from '../automation.types';
import { deliver } from '../delivery';
import { classroomLabel } from '../recipients';

/** Días antes del fin del periodo en que se avisa. */
const NOTICE_DAYS = [7, 3];

/**
 * Antes del cierre de cada periodo, avisa a los docentes que todavía no registran ninguna nota
 * en alguno de sus cursos, y envía un resumen a la Dirección.
 */
async function run(ctx: JobContext): Promise<JobResult> {
  if (!ctx.activeYearId) return { items: 0, summary: 'No hay año lectivo activo.' };
  const year = await prisma.academicYear.findUnique({ where: { id: ctx.activeYearId } });
  if (!year) return { items: 0, summary: 'No hay año lectivo activo.' };

  // ¿Algún periodo termina dentro de 7 o 3 días?
  let target: { periodNumber: number; daysLeft: number; endStr: string } | null = null;
  for (let p = 1; p <= periodCount(year); p++) {
    const endStr = getPeriodDateRange(year, p).endDate.toISOString().slice(0, 10);
    for (const d of NOTICE_DAYS) {
      if (endStr === addDays(ctx.today, d)) target = { periodNumber: p, daysLeft: d, endStr };
    }
  }
  if (!target) return { items: 0, summary: 'Ningún periodo cierra en 7 o 3 días.' };

  const assignments = await prisma.courseAssignment.findMany({
    where: { schoolId: ctx.schoolId, academicYearId: year.id, deletedAt: null },
    select: {
      id: true,
      teacherId: true,
      area: { select: { name: true } },
      classroom: { select: { grade: true, section: true, educationLevel: true } },
      teacher: { select: { email: true, isActive: true, firstName: true, lastNamePaternal: true } },
    },
  });
  const gradeCounts = await prisma.detailedGrade.groupBy({
    by: ['courseAssignmentId'],
    where: { schoolId: ctx.schoolId, periodNumber: target.periodNumber, courseAssignmentId: { in: assignments.map((a) => a.id) } },
    _count: { _all: true },
  });
  const withGrades = new Set(gradeCounts.filter((g) => g._count._all > 0).map((g) => g.courseAssignmentId));
  const missing = assignments.filter((a) => !withGrades.has(a.id) && a.teacher.isActive);
  if (missing.length === 0) return { items: 0, summary: 'Todos los cursos tienen notas registradas.' };

  const pName = periodName(year, target.periodNumber);
  const byTeacher = new Map<string, typeof missing>();
  for (const a of missing) {
    if (!byTeacher.has(a.teacherId)) byTeacher.set(a.teacherId, []);
    byTeacher.get(a.teacherId)!.push(a);
  }

  for (const [teacherId, courses] of byTeacher) {
    const list = courses.map((c) => `${c.area.name} (${classroomLabel(c.classroom)})`);
    const title = `Faltan notas del ${pName}`;
    const message = `El periodo cierra en ${target.daysLeft} días (${formatLongDate(target.endStr)}). Aún no hay notas en: ${list.join(', ')}.`;
    await deliver(
      ctx.schoolId,
      [{ userId: teacherId, email: courses[0].teacher.email }],
      {
        title,
        message,
        type: 'ACADEMIC',
        link: '/my-courses',
        email: {
          subject: title,
          heading: title,
          bodyHtml: `<p>El <strong>${escapeHtml(pName)}</strong> cierra el <strong>${escapeHtml(formatLongDate(target.endStr))}</strong> (en ${target.daysLeft} días).</p>
            <p>Todavía no hay notas registradas en:</p>
            <ul>${list.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`,
          text: message,
          ctaLabel: 'Registrar notas',
        },
      },
      { schoolName: ctx.schoolName, nowTime: ctx.nowTime },
    );
  }

  // Resumen para la Dirección (solo app y push)
  const admins = await prisma.user.findMany({
    where: { schoolId: ctx.schoolId, role: 'SCHOOL_ADMIN', isActive: true },
    select: { id: true },
  });
  await deliver(
    ctx.schoolId,
    admins.map((a) => ({ userId: a.id })),
    {
      title: `${byTeacher.size} docente(s) sin notas del ${pName}`,
      message: `${missing.length} curso(s) sin notas a ${target.daysLeft} días del cierre. Ya se avisó a cada docente.`,
      type: 'ACADEMIC',
      link: '/academic/progress',
    },
    { schoolName: ctx.schoolName, nowTime: ctx.nowTime },
  );

  return { items: byTeacher.size, summary: `${byTeacher.size} docente(s) avisado(s); ${missing.length} curso(s) sin notas.` };
}

export const gradesMissingJob: AutomationJob = {
  name: 'grades-missing-before-close',
  label: 'Docentes sin notas antes del cierre',
  description: 'A 7 y 3 días del fin de cada periodo, avisa a los docentes con cursos sin notas y resume la situación a la Dirección.',
  audience: 'Docentes y Dirección',
  channels: 'App, push y correo',
  // Todos los días: el aviso depende de la fecha de cierre, que puede caer en cualquier día
  schedule: { time: '08:30' },
  scheduleLabel: 'Todos los días, 8:30 a. m. (solo a 7 y 3 días del cierre)',
  defaultEnabled: true,
  minPlan: 'PRO',
  run,
};
