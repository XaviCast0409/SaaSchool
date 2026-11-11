import { prisma } from '../../config/prisma';
import { getSchoolNow } from '../../utils/timezone.util';
import { limaWeekday, type ScheduleScope } from './attendance.rules';
import type { AttendanceService } from './attendance.service';

/**
 * Cierre automático de asistencia, cada 60 s, de lunes a viernes (hora de Lima).
 * Cada horario cierra SOLO los niveles que gobierna (ver levelsForScope).
 * Al terminar el cierre de un colegio, evalúa la alerta temprana de ausentismo una vez al día.
 */
export function initAttendanceAutoCloseCron(attendanceService: AttendanceService): () => void {
  let isExecuting = false;

  const intervalId = setInterval(async () => {
    if (isExecuting) return;
    isExecuting = true;
    try {
      const weekday = limaWeekday();
      if (weekday === 0 || weekday === 6) return;

      const schoolNow = getSchoolNow();
      const currentTimeStr = `${String(schoolNow.hour).padStart(2, '0')}:${String(schoolNow.minute).padStart(2, '0')}`;
      const todayDate = schoolNow.dateObj;

      const candidateConfigs = await prisma.attendanceScheduleConfig.findMany({
        where: {
          autoCloseEnabled: true,
          OR: [{ lastAutoClosedOn: null }, { lastAutoClosedOn: { lt: todayDate } }],
        },
        select: { id: true, schoolId: true, scope: true, autoCloseTime: true },
      });

      const dueConfigs = candidateConfigs.filter(
        (config) => currentTimeStr >= config.autoCloseTime && currentTimeStr < '18:00',
      );
      if (dueConfigs.length === 0) return;

      const holidays = await prisma.schoolHoliday.findMany({
        where: { date: todayDate, schoolId: { in: dueConfigs.map((c) => c.schoolId) } },
        select: { schoolId: true },
      });
      const holidaySchoolIds = new Set(holidays.map((h) => h.schoolId));

      const processedSchools = new Set<string>();

      for (const config of dueConfigs) {
        try {
          if (!holidaySchoolIds.has(config.schoolId)) {
            const closed = await attendanceService.closeAttendanceForScope(
              config.schoolId,
              config.scope as ScheduleScope,
              schoolNow.dateStr,
            );
            if (closed > 0) {
              console.log(
                `[Cron Auto-Cierre] Colegio ${config.schoolId} (${config.scope}): ${closed} faltas asignadas a las ${currentTimeStr}.`,
              );
            }
            processedSchools.add(config.schoolId);
          }
          await prisma.attendanceScheduleConfig.update({
            where: { id: config.id },
            data: { lastAutoClosedOn: todayDate },
          });
        } catch (error) {
          console.error(`[Cron Auto-Cierre] Error en colegio ${config.schoolId} (${config.scope}):`, error);
        }
      }

      for (const schoolId of processedSchools) {
        await attendanceService
          .evaluateRiskForSchoolOncePerDay(schoolId, schoolNow.dateStr)
          .catch((error) => console.error(`[Cron Riesgo] Error en colegio ${schoolId}:`, error));
      }
    } catch (error) {
      console.error('[Cron Auto-Cierre] Error general:', error);
    } finally {
      isExecuting = false;
    }
  }, 60 * 1000);

  return () => clearInterval(intervalId);
}
