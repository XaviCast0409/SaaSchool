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

      // Buscar configuraciones de colegios con auto-cierre activado que coincidan con el minuto actual
      const activeConfigs = await prisma.attendanceScheduleConfig.findMany({
        where: {
          autoCloseEnabled: true,
          autoCloseTime: currentTimeStr,
        },
        select: {
          schoolId: true,
          scope: true,
          autoCloseTime: true,
        },
      });

      if (activeConfigs.length === 0) return;

      for (const config of activeConfigs) {
        try {
          const result = await attendanceRepository.closeAttendance({
            schoolId: config.schoolId,
            dateStr: schoolNow.dateStr,
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
