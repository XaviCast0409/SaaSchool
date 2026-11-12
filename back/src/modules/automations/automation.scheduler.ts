import { prisma } from '../../config/prisma';
import { getSchoolNow } from '../../utils/timezone.util';
import { limaWeekday } from '../attendance/attendance.rules';
import { AUTOMATION_JOBS, planAllows } from './automation.registry';
import { isJobDue } from './automation.rules';
import { buildContext, runJobOnce } from './automation.runner';

/**
 * Programador de automatizaciones. Cada minuto revisa, por colegio activo, qué trabajos
 * deben correr hoy (según su horario y si el colegio los tiene activados) y los ejecuta una sola vez
 * (runKey = fecha de Lima). Si el servidor estuvo apagado, recupera lo pendiente hasta las 21:00.
 * Costo cero: corre dentro del mismo proceso del API (Render Starter siempre encendido).
 */
export function initAutomationScheduler(): () => void {
  let isExecuting = false;

  const tick = async () => {
    if (isExecuting) return;
    isExecuting = true;
    try {
      const now = getSchoolNow();
      const weekday = limaWeekday();
      const nowTime = `${String(now.hour).padStart(2, '0')}:${String(now.minute).padStart(2, '0')}`;

      const schools = await prisma.school.findMany({
        where: { isActive: true, OR: [{ planExpiresAt: null }, { planExpiresAt: { gt: new Date() } }] },
        select: { id: true, name: true, plan: true },
      });
      if (schools.length === 0) return;

      const [settings, holidays, todaysRuns] = await Promise.all([
        prisma.schoolAutomationSetting.findMany({ select: { schoolId: true, jobName: true, enabled: true } }),
        prisma.schoolHoliday.findMany({ where: { date: now.dateObj }, select: { schoolId: true } }),
        prisma.jobRun.findMany({ where: { runKey: now.dateStr }, select: { schoolId: true, jobName: true } }),
      ]);
      const enabledOf = new Map(settings.map((s) => [`${s.schoolId}:${s.jobName}`, s.enabled]));
      const holidaySchools = new Set(holidays.map((h) => h.schoolId));
      const alreadyRan = new Set(todaysRuns.map((r) => `${r.schoolId}:${r.jobName}`));

      for (const school of schools) {
        const dueJobs = AUTOMATION_JOBS.filter((job) => {
          const key = `${school.id}:${job.name}`;
          if (alreadyRan.has(key)) return false;
          if (!planAllows(school.plan, job.minPlan)) return false;
          if (!(enabledOf.get(key) ?? job.defaultEnabled)) return false;
          return isJobDue({ schedule: job.schedule, nowTime, weekday, isHoliday: holidaySchools.has(school.id) });
        });
        if (dueJobs.length === 0) continue;

        const ctx = await buildContext(school, now, weekday);
        for (const job of dueJobs) {
          const outcome = await runJobOnce(job, ctx, now.dateStr);
          if (outcome?.result) {
            console.log(`[Automatizaciones] ${job.name} · ${school.name}: ${outcome.result.summary}`);
          }
        }
      }
    } catch (error) {
      console.error('[Automatizaciones] Error general del programador:', error);
    } finally {
      isExecuting = false;
    }
  };

  // Primera revisión a los 30 s del arranque (recupera lo pendiente tras un deploy), luego cada minuto
  const firstRun = setTimeout(() => void tick(), 30 * 1000);
  const intervalId = setInterval(() => void tick(), 60 * 1000);

  return () => {
    clearTimeout(firstRun);
    clearInterval(intervalId);
  };
}
