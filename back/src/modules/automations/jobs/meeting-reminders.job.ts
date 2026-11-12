import { prisma } from '../../../config/prisma';
import { formatLimaDateTime } from '../../../utils/timezone.util';
import { addDays, limaDayRange } from '../automation.rules';
import type { AutomationJob, JobContext, JobResult } from '../automation.types';
import { deliver } from '../delivery';
import { studentShortName } from '../recipients';

const MODE_LABEL: Record<string, string> = { IN_PERSON: 'presencial', VIRTUAL: 'por videollamada', PHONE: 'por llamada' };

/** Recordatorio la víspera de cada entrevista reservada, a la familia y al docente. */
async function run(ctx: JobContext): Promise<JobResult> {
  const slots = await prisma.meetingSlot.findMany({
    where: { schoolId: ctx.schoolId, status: 'BOOKED', startsAt: limaDayRange(addDays(ctx.today, 1)) },
    select: {
      startsAt: true,
      mode: true,
      location: true,
      staffId: true,
      bookedByParentId: true,
      staff: { select: { firstName: true, lastNamePaternal: true } },
      parent: { select: { firstName: true, lastNamePaternal: true } },
      student: { select: { firstNames: true, lastNamePaternal: true } },
    },
  });
  for (const s of slots) {
    const when = formatLimaDateTime(s.startsAt, { hour: '2-digit', minute: '2-digit' });
    const where = s.location ? ` · ${s.location}` : '';
    const student = s.student ? studentShortName(s.student) : '';
    if (s.bookedByParentId) {
      await deliver(
        ctx.schoolId,
        [{ userId: s.bookedByParentId }],
        {
          title: 'Mañana tiene una entrevista',
          message: `Con ${s.staff.firstName} ${s.staff.lastNamePaternal} a las ${when}, ${MODE_LABEL[s.mode]}${where}.`,
          type: 'GENERAL',
          link: '/meetings',
        },
        { schoolName: ctx.schoolName, nowTime: ctx.nowTime },
      );
    }
    await deliver(
      ctx.schoolId,
      [{ userId: s.staffId }],
      {
        title: 'Entrevista mañana',
        message: `${s.parent ? `${s.parent.firstName} ${s.parent.lastNamePaternal}` : 'Familia'} (${student}) a las ${when}, ${MODE_LABEL[s.mode]}${where}.`,
        type: 'GENERAL',
        link: '/meetings',
      },
      { schoolName: ctx.schoolName, nowTime: ctx.nowTime },
    );
  }
  return { items: slots.length, summary: slots.length ? `${slots.length} entrevista(s) recordada(s).` : 'No hay entrevistas mañana.' };
}

export const meetingRemindersJob: AutomationJob = {
  name: 'meeting-reminders',
  label: 'Recordatorio de entrevistas',
  description: 'La víspera de cada entrevista reservada, recuerda la hora y el lugar a la familia y al docente.',
  audience: 'Familias y docentes',
  channels: 'App y push',
  schedule: { time: '18:00' },
  scheduleLabel: 'Todos los días, 6:00 p. m.',
  defaultEnabled: true,
  minPlan: 'BASIC',
  run,
};
