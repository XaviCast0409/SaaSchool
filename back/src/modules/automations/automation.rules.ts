/**
 * Reglas puras del motor de automatizaciones (sin base de datos), para poder probarlas.
 * Toda la lógica de horas usa la hora de Lima (UTC-5, sin horario de verano).
 */

export interface JobSchedule {
  /** Hora local de Lima 'HH:mm' a partir de la cual el trabajo debe correr ese día. */
  time: string;
  /** Días de la semana permitidos (0 = domingo … 6 = sábado). Sin valor = todos los días. */
  weekdays?: number[];
  /** Solo días lectivos: excluye fines de semana y feriados del colegio. */
  schoolDaysOnly?: boolean;
}

/** Último momento del día en que se permite recuperar un trabajo atrasado (no enviar avisos de noche). */
export const CATCH_UP_LIMIT = '21:00';

export interface DueCheckInput {
  schedule: JobSchedule;
  /** Hora actual de Lima 'HH:mm'. */
  nowTime: string;
  /** Día de la semana actual en Lima. */
  weekday: number;
  isHoliday: boolean;
}

/**
 * ¿Le toca correr hoy al trabajo? Corre una vez desde su hora programada hasta CATCH_UP_LIMIT.
 * Si el servidor estuvo apagado a la hora exacta, lo recupera al volver (la unicidad del JobRun evita duplicados).
 */
export function isJobDue({ schedule, nowTime, weekday, isHoliday }: DueCheckInput): boolean {
  if (schedule.weekdays && !schedule.weekdays.includes(weekday)) return false;
  if (schedule.schoolDaysOnly && (weekday === 0 || weekday === 6 || isHoliday)) return false;
  return nowTime >= schedule.time && nowTime < CATCH_UP_LIMIT;
}

/** ¿La hora actual cae dentro del rango de silencio del usuario? Soporta rangos que cruzan medianoche. */
export function isInQuietHours(nowTime: string, quietFrom?: string | null, quietTo?: string | null): boolean {
  if (!quietFrom || !quietTo || quietFrom === quietTo) return false;
  if (quietFrom < quietTo) return nowTime >= quietFrom && nowTime < quietTo;
  return nowTime >= quietFrom || nowTime < quietTo;
}

/** Suma días a una fecha 'YYYY-MM-DD' (aritmética en UTC, sin efecto de zona horaria). */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Fecha 'YYYY-MM-DD' como medianoche UTC (así se guardan las columnas de solo fecha). */
export function dateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/**
 * Rango [inicio, fin) en UTC que corresponde a un día completo de Lima.
 * Lima es UTC-5 todo el año: el día local empieza a las 05:00 UTC.
 */
export function limaDayRange(dateStr: string): { gte: Date; lt: Date } {
  const gte = new Date(`${dateStr}T05:00:00.000Z`);
  const lt = new Date(gte.getTime() + 86_400_000);
  return { gte, lt };
}

/** 'HH:mm' válido (00:00–23:59). */
export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Mes y día 'MM-DD' de una fecha de nacimiento guardada a medianoche UTC. */
export function monthDayKey(date: Date): string {
  return date.toISOString().slice(5, 10);
}

/** Fecha corta en español, p. ej. "viernes 15 de noviembre". */
export function formatLongDate(dateStr: string): string {
  return new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    dateOnly(dateStr),
  );
}

export function formatMoney(value: number): string {
  return `S/ ${value.toFixed(2)}`;
}
