import { prisma } from '../../config/prisma';
import { getSchoolNow } from '../../utils/timezone.util';
import type { AttendanceRepository } from './attendance.repository';

/**
 * Tarea periódica programada (Cron) para el cierre automático de asistencia escolar.
 * Implementado con temporizador nativo de Node.js (cero dependencias externas).
 * Se evalúa cada 60 segundos únicamente de Lunes a Viernes bajo la hora oficial de Perú (America/Lima).
 */
export function initAttendanceAutoCloseCron(attendanceRepository: AttendanceRepository): () => void {
  let isExecuting = false;

  const intervalId = setInterval(async () => {
    if (isExecuting) return;

    try {
      isExecuting = true;
      const schoolNow = getSchoolNow();

      // Excluir fines de semana (0: Domingo, 6: Sábado)
      const dayOfWeek = schoolNow.fullDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return;
      }

      const currentTimeStr = `${String(schoolNow.hour).padStart(2, '0')}:${String(schoolNow.minute).padStart(2, '0')}`;

      const todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
      const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

      const candidateConfigs = await prisma.attendanceScheduleConfig.findMany({
        where: {
          autoCloseEnabled: true,
          OR: [{ lastAutoClosedOn: null }, { lastAutoClosedOn: { lt: todayDate } }],
        },
        select: { id: true, schoolId: true, scope: true, autoCloseTime: true },
      });

      // Ejecutar a partir de la hora configurada (no solo en el minuto exacto) y nunca después de las 18:00
      const dueConfigs = candidateConfigs.filter(
        (config) => currentTimeStr >= config.autoCloseTime && currentTimeStr < '18:00',
      );

      if (dueConfigs.length === 0) return;

      const holidays = await prisma.schoolHoliday.findMany({
        where: { date: todayDate, schoolId: { in: dueConfigs.map((c) => c.schoolId) } },
        select: { schoolId: true },
      });
      const holidaySchoolIds = new Set(holidays.map((h) => h.schoolId));

      // Marcar feriados para no reevaluarlos en todo el día
      const holidayConfigs = dueConfigs.filter((config) => holidaySchoolIds.has(config.schoolId));
      for (const config of holidayConfigs) {
        await prisma.attendanceScheduleConfig
          .update({ where: { id: config.id }, data: { lastAutoClosedOn: todayDate } })
          .catch((err) => console.error('[Cron Auto-Cierre Holiday Update Error]:', err));
      }

      const activeConfigs = dueConfigs.filter((config) => !holidaySchoolIds.has(config.schoolId));
      if (activeConfigs.length === 0) return;

      for (const config of activeConfigs) {
        try {
          const result = await attendanceRepository.closeAttendance({
            schoolId: config.schoolId,
            dateStr: schoolNow.dateStr,
          });

          await prisma.attendanceScheduleConfig.update({
            where: { id: config.id },
            data: { lastAutoClosedOn: todayDate },
          });

          if (result.closedCount > 0) {
            console.log(
              `[Cron Auto-Cierre] Colegio ${config.schoolId} (${config.scope}): ${result.closedCount} faltas asignadas automáticamente a las ${currentTimeStr}.`
            );
          }
        } catch (schoolErr) {
          console.error(`[Cron Auto-Cierre] Error al cerrar asistencia del colegio ${config.schoolId}:`, schoolErr);
        }
      }
    } catch (err) {
      console.error('[Cron Auto-Cierre] Error general en el programador de asistencia:', err);
    } finally {
      isExecuting = false;
    }
  }, 60 * 1000);

  // Retorna función para detener el cron en caso de shutdown
  return () => clearInterval(intervalId);
}
