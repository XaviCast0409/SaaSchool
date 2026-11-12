import { prisma } from '../../../config/prisma';
import { escapeHtml } from '../../../utils/notification.util';
import { remainingBalance } from '../../payments/payment.rules';
import { addDays, dateOnly, formatMoney, limaDayRange } from '../automation.rules';
import type { AutomationJob, JobContext, JobResult } from '../automation.types';
import { deliver } from '../delivery';
import { guardiansByStudent, studentShortName } from '../recipients';

/**
 * Resumen semanal por hijo (domingo por la tarde): asistencia de la semana, tareas de la próxima
 * semana, comunicados nuevos y pagos pendientes. La familia puede desactivarlo en sus preferencias.
 */
async function run(ctx: JobContext): Promise<JobResult> {
  if (!ctx.activeYearId) return { items: 0, summary: 'No hay año lectivo activo.' };

  const weekStart = addDays(ctx.today, -6);
  const nextWeekEnd = addDays(ctx.today, 7);

  const enrollments = await prisma.enrollment.findMany({
    where: { schoolId: ctx.schoolId, academicYearId: ctx.activeYearId, isActive: true, enrollmentState: 'REGISTERED' },
    select: {
      id: true,
      classroomId: true,
      student: { select: { id: true, firstNames: true, lastNamePaternal: true } },
      attendances: {
        where: { date: { gte: dateOnly(weekStart), lte: dateOnly(ctx.today) } },
        select: { status: true },
      },
      obligations: {
        where: { status: { in: ['PENDING', 'PARTIAL'] }, dueDate: { lt: dateOnly(ctx.today) } },
        select: { amountDue: true, transactions: { select: { amountPaid: true } } },
      },
      homeworkSubmissions: { select: { courseContentId: true } },
    },
  });
  if (enrollments.length === 0) return { items: 0, summary: 'Sin alumnos matriculados.' };

  // Tareas de la próxima semana por aula
  const homeworks = await prisma.courseContent.findMany({
    where: {
      schoolId: ctx.schoolId,
      contentType: 'HOMEWORK',
      dueDate: { gte: limaDayRange(addDays(ctx.today, 1)).gte, lt: limaDayRange(nextWeekEnd).lt },
      courseAssignment: { deletedAt: null, academicYearId: ctx.activeYearId },
    },
    select: { id: true, courseAssignment: { select: { classroomId: true } } },
  });
  const homeworkByClassroom = new Map<string, string[]>();
  for (const hw of homeworks) {
    const k = hw.courseAssignment.classroomId;
    if (!homeworkByClassroom.has(k)) homeworkByClassroom.set(k, []);
    homeworkByClassroom.get(k)!.push(hw.id);
  }

  // Comunicados de la semana dirigidos a familias (generales o del aula)
  const announcements = await prisma.announcement.findMany({
    where: {
      schoolId: ctx.schoolId,
      isActive: true,
      targetRoles: { has: 'PARENT' },
      publishedAt: { gte: limaDayRange(weekStart).gte },
    },
    select: { classroomId: true },
  });

  const guardians = await guardiansByStudent(enrollments.map((e) => e.student.id));
  let sent = 0;

  for (const e of enrollments) {
    const fam = guardians.get(e.student.id) ?? [];
    if (fam.length === 0) continue;
    const name = studentShortName(e.student);

    const present = e.attendances.filter((a) => a.status === 'PRESENT').length;
    const late = e.attendances.filter((a) => a.status.startsWith('LATE')).length;
    const absent = e.attendances.filter((a) => a.status.startsWith('ABSENT')).length;
    const submitted = new Set(e.homeworkSubmissions.map((s) => s.courseContentId));
    const pendingHw = (homeworkByClassroom.get(e.classroomId) ?? []).filter((id) => !submitted.has(id)).length;
    const newAnnouncements = announcements.filter((a) => !a.classroomId || a.classroomId === e.classroomId).length;
    const debt = e.obligations.reduce((sum, o) => sum + remainingBalance(o.amountDue, o.transactions), 0);

    const parts: string[] = [];
    if (e.attendances.length > 0) {
      parts.push(`Asistencia: ${present + late} de ${e.attendances.length} días${late ? ` (${late} tardanza${late > 1 ? 's' : ''})` : ''}${absent ? `, ${absent} falta${absent > 1 ? 's' : ''}` : ''}`);
    }
    if (pendingHw > 0) parts.push(`${pendingHw} tarea${pendingHw > 1 ? 's' : ''} para esta semana`);
    if (newAnnouncements > 0) parts.push(`${newAnnouncements} comunicado${newAnnouncements > 1 ? 's' : ''} nuevo${newAnnouncements > 1 ? 's' : ''}`);
    if (debt > 0) parts.push(`Pagos vencidos: ${formatMoney(debt)}`);
    if (parts.length === 0) parts.push('Semana sin novedades. ¡Todo en orden!');

    const title = `Resumen semanal de ${name}`;
    const rows = [
      ['Asistencia de la semana', e.attendances.length > 0 ? `${present} presente(s), ${late} tardanza(s), ${absent} falta(s)` : 'Sin registros'],
      ['Tareas para esta semana', pendingHw > 0 ? `${pendingHw} pendiente(s)` : 'Ninguna pendiente'],
      ['Comunicados nuevos', String(newAnnouncements)],
      ['Pagos vencidos', debt > 0 ? formatMoney(debt) : 'Al día'],
    ];
    const bodyHtml = `<p>Este es el resumen de la semana de <strong>${escapeHtml(name)}</strong>:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0;">
        ${rows.map(([k, v]) => `<tr><td style="padding:8px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">${escapeHtml(k)}</td><td style="padding:8px 0;color:#0f172a;font-weight:600;text-align:right;border-bottom:1px solid #f1f5f9;">${escapeHtml(v)}</td></tr>`).join('')}
      </table>`;

    await deliver(
      ctx.schoolId,
      fam,
      {
        title,
        message: parts.join(' · '),
        type: 'GENERAL',
        link: '/dashboard',
        respectWeeklyDigest: true,
        email: { subject: title, heading: title, bodyHtml, text: parts.join('\n'), ctaLabel: 'Ver en la app' },
      },
      { schoolName: ctx.schoolName, nowTime: ctx.nowTime },
    );
    sent++;
  }

  return { items: sent, summary: `${sent} resumen(es) enviado(s).` };
}

export const weeklyDigestJob: AutomationJob = {
  name: 'weekly-family-digest',
  label: 'Resumen semanal para la familia',
  description: 'Cada domingo, un resumen por hijo: asistencia, tareas de la semana, comunicados y pagos vencidos.',
  audience: 'Familias',
  channels: 'App, push y correo',
  schedule: { time: '18:00', weekdays: [0] },
  scheduleLabel: 'Domingos, 6:00 p. m.',
  defaultEnabled: true,
  minPlan: 'BASIC',
  run,
};
