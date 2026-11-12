import { prisma } from '../../../config/prisma';
import { monthDayKey } from '../automation.rules';
import type { AutomationJob, JobContext, JobResult } from '../automation.types';
import { deliver } from '../delivery';
import { classroomLabel, studentShortName } from '../recipients';

/** Saludo de cumpleaños al alumno y aviso a su tutor (un detalle que las familias valoran mucho). */
async function run(ctx: JobContext): Promise<JobResult> {
  if (!ctx.activeYearId) return { items: 0, summary: 'No hay año lectivo activo.' };
  const todayKey = ctx.today.slice(5, 10);

  const enrollments = await prisma.enrollment.findMany({
    where: { schoolId: ctx.schoolId, academicYearId: ctx.activeYearId, isActive: true, enrollmentState: 'REGISTERED' },
    select: {
      student: { select: { id: true, firstNames: true, lastNamePaternal: true, birthDate: true } },
      classroom: { select: { grade: true, section: true, educationLevel: true, tutorTeacherId: true } },
    },
  });

  // 29 de febrero se celebra el 28 en años no bisiestos
  const year = Number(ctx.today.slice(0, 4));
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const matches = enrollments.filter((e) => {
    const key = monthDayKey(e.student.birthDate);
    return key === todayKey || (!isLeap && key === '02-29' && todayKey === '02-28');
  });
  if (matches.length === 0) return { items: 0, summary: 'Hoy no hay cumpleaños.' };

  const byTutor = new Map<string, string[]>();
  for (const e of matches) {
    const first = e.student.firstNames.split(' ')[0];
    await deliver(
      ctx.schoolId,
      [{ studentId: e.student.id }],
      {
        title: `¡Feliz cumpleaños, ${first}! 🎉`,
        message: `Toda la familia de ${ctx.schoolName} te desea un día increíble.`,
        type: 'GENERAL',
        link: '/dashboard',
      },
      { schoolName: ctx.schoolName, nowTime: ctx.nowTime },
    );
    if (e.classroom.tutorTeacherId) {
      if (!byTutor.has(e.classroom.tutorTeacherId)) byTutor.set(e.classroom.tutorTeacherId, []);
      byTutor.get(e.classroom.tutorTeacherId)!.push(`${studentShortName(e.student)} (${classroomLabel(e.classroom)})`);
    }
  }

  for (const [tutorId, names] of byTutor) {
    await deliver(
      ctx.schoolId,
      [{ userId: tutorId }],
      {
        title: names.length === 1 ? 'Hoy hay un cumpleaños en tu aula' : `Hoy hay ${names.length} cumpleaños en tu aula`,
        message: names.join(', '),
        type: 'GENERAL',
        link: '/dashboard',
      },
      { schoolName: ctx.schoolName, nowTime: ctx.nowTime },
    );
  }

  return { items: matches.length, summary: `${matches.length} cumpleaños saludado(s).` };
}

export const birthdaysJob: AutomationJob = {
  name: 'student-birthdays',
  label: 'Saludo de cumpleaños',
  description: 'Saluda al alumno el día de su cumpleaños y avisa a su tutor para que lo celebre en el aula.',
  audience: 'Alumnos y tutores',
  channels: 'App y push',
  schedule: { time: '07:00' },
  scheduleLabel: 'Todos los días, 7:00 a. m.',
  defaultEnabled: true,
  minPlan: 'BASIC',
  run,
};
