import { prisma } from '../../../config/prisma';
import { addDays, limaDayRange } from '../automation.rules';
import type { AutomationJob, JobContext, JobResult } from '../automation.types';
import { deliver } from '../delivery';
import { guardiansByStudent, studentShortName } from '../recipients';

/** Tareas del aula virtual que vencen mañana y que el alumno aún no entregó. */
async function run(ctx: JobContext): Promise<JobResult> {
  const tomorrow = addDays(ctx.today, 1);
  const homeworks = await prisma.courseContent.findMany({
    where: {
      schoolId: ctx.schoolId,
      contentType: 'HOMEWORK',
      dueDate: limaDayRange(tomorrow),
      courseAssignment: { deletedAt: null },
    },
    select: {
      id: true,
      title: true,
      submissions: { select: { enrollmentId: true } },
      courseAssignment: { select: { classroomId: true, academicYearId: true, area: { select: { name: true } } } },
    },
  });
  if (homeworks.length === 0) return { items: 0, summary: 'No hay tareas que venzan mañana.' };

  // Alumno → lista de tareas pendientes
  const pendingByEnrollment = new Map<string, { studentId: string; name: string; tasks: string[] }>();
  for (const hw of homeworks) {
    const submitted = new Set(hw.submissions.map((s) => s.enrollmentId));
    const enrollments = await prisma.enrollment.findMany({
      where: {
        schoolId: ctx.schoolId,
        classroomId: hw.courseAssignment.classroomId,
        academicYearId: hw.courseAssignment.academicYearId,
        isActive: true,
        enrollmentState: 'REGISTERED',
      },
      select: { id: true, student: { select: { id: true, firstNames: true, lastNamePaternal: true } } },
    });
    for (const e of enrollments) {
      if (submitted.has(e.id)) continue;
      if (!pendingByEnrollment.has(e.id)) {
        pendingByEnrollment.set(e.id, { studentId: e.student.id, name: studentShortName(e.student), tasks: [] });
      }
      pendingByEnrollment.get(e.id)!.tasks.push(`${hw.courseAssignment.area.name}: ${hw.title}`);
    }
  }

  const entries = [...pendingByEnrollment.values()];
  const guardians = await guardiansByStudent(entries.map((e) => e.studentId));
  for (const entry of entries) {
    const count = entry.tasks.length;
    const list = entry.tasks.slice(0, 3).join(' · ') + (count > 3 ? ` y ${count - 3} más` : '');
    // Alumno
    await deliver(
      ctx.schoolId,
      [{ studentId: entry.studentId }],
      {
        title: count === 1 ? 'Mañana vence una tarea' : `Mañana vencen ${count} tareas`,
        message: list,
        type: 'ACADEMIC',
        link: '/virtual-classroom',
      },
      { schoolName: ctx.schoolName, nowTime: ctx.nowTime },
    );
    // Familia (solo app y push, sin correo)
    const fam = guardians.get(entry.studentId) ?? [];
    if (fam.length > 0) {
      await deliver(
        ctx.schoolId,
        fam.map((g) => ({ userId: g.userId })),
        {
          title: `${entry.name}: ${count === 1 ? 'tarea' : `${count} tareas`} para mañana`,
          message: list,
          type: 'ACADEMIC',
          link: '/virtual-classroom',
        },
        { schoolName: ctx.schoolName, nowTime: ctx.nowTime },
      );
    }
  }

  return { items: entries.length, summary: `${entries.length} alumno(s) con tareas pendientes para mañana.` };
}

export const homeworkDueTomorrowJob: AutomationJob = {
  name: 'homework-due-tomorrow',
  label: 'Tareas que vencen mañana',
  description: 'Avisa al alumno y a su familia de las tareas del aula virtual que vencen mañana y aún no se entregaron.',
  audience: 'Alumnos y familias',
  channels: 'App y push',
  schedule: { time: '17:00' },
  scheduleLabel: 'Todos los días, 5:00 p. m.',
  defaultEnabled: true,
  minPlan: 'PRO',
  run,
};
