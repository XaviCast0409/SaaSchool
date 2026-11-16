import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { parseSchoolDate } from '../../utils/timezone.util';
import { nationalHolidays } from '../calendar/official-dates';
import { isSchoolDay } from './attendance.rules';

/**
 * Lanza 400 si la fecha no es día lectivo para el colegio: fin de semana, feriado nacional,
 * feriado propio del colegio o fuera del año escolar activo.
 * Compartida por la asistencia diaria y la asistencia por curso.
 */
export async function assertSchoolDay(schoolId: string, dateInput: string | Date): Promise<void> {
  const dateStr =
    typeof dateInput === 'string' ? dateInput.slice(0, 10) : dateInput.toISOString().slice(0, 10);

  const [activeYear, schoolHoliday] = await Promise.all([
    prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      select: { year: true, startDate: true, endDate: true },
    }),
    // Solo interesa el feriado de esa fecha, no todos los del colegio
    prisma.schoolHoliday.findFirst({
      where: { schoolId, date: parseSchoolDate(dateStr) },
      select: { name: true },
    }),
  ]);

  const yearNumber = Number(dateStr.slice(0, 4));
  const holidaysMap = new Map<string, string>();
  for (const nh of !isNaN(yearNumber) ? nationalHolidays(yearNumber) : []) {
    holidaysMap.set(nh.date, nh.name);
  }
  if (schoolHoliday) holidaysMap.set(dateStr, schoolHoliday.name);

  const check = isSchoolDay(dateStr, activeYear, holidaysMap);
  if (!check.isSchoolDay) {
    // Mensaje concreto: fin de semana, qué feriado o fuera de qué año escolar
    throw new AppError(check.message || 'No se puede registrar asistencia en un día no lectivo.', 400);
  }
}
