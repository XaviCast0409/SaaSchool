/**
 * Utilidades para manejo de fechas y horas en la zona horaria del colegio (SaaS Multi-tenant).
 * Evita desfaces por servidores en UTC (AWS, Railway, Render, etc.).
 */

export interface SchoolNowResult {
  dateStr: string;   // Formato YYYY-MM-DD
  dateObj: Date;     // Fecha normalizada en UTC midnight para @db.Date en PostgreSQL
  hour: number;      // Hora local 0-23
  minute: number;    // Minuto local 0-59
  fullDate: Date;    // Instante Date actual
}

export function getSchoolTimeParts(instant: Date, timeZone = 'America/Lima'): SchoolNowResult {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23', // evita "24:00" a medianoche en algunos motores
  });

  const parts = formatter.formatToParts(instant);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = parseInt(getPart('hour'), 10);
  const minute = parseInt(getPart('minute'), 10);

  const dateStr = `${year}-${month}-${day}`;
  const dateObj = new Date(`${dateStr}T00:00:00.000Z`);

  return {
    dateStr,
    dateObj,
    hour,
    minute,
    fullDate: instant,
  };
}

export function getSchoolNow(timeZone: string = 'America/Lima'): SchoolNowResult {
  return getSchoolTimeParts(new Date(), timeZone);
}

export function parseSchoolDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export const SCHOOL_TIME_ZONE = 'America/Lima';

/** Clave 'YYYY-MM-DD' de una fecha sin hora (@db.Date se guarda a medianoche UTC). */
export function dateOnlyKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Rango de un mes 'YYYY-MM' para columnas de solo fecha (@db.Date), independiente de la zona
 * horaria del servidor. Sin mes, usa el mes actual de Lima.
 */
export function monthRangeUTC(period?: string): { period: string; year: number; month: number; startDate: Date; endDate: Date; daysInMonth: number } {
  const p = period || getSchoolNow().dateStr.slice(0, 7);
  const [year, month] = p.split('-').map(Number);
  return {
    period: p,
    year,
    month,
    startDate: new Date(Date.UTC(year, month - 1, 1)),
    endDate: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
    daysInMonth: new Date(Date.UTC(year, month, 0)).getUTCDate(),
  };
}

/** Formatea una fecha SIN hora (vencimientos, cumpleaños, asistencia) sin correrla un día. */
export function formatDateOnly(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' },
): string {
  return new Date(date).toLocaleDateString('es-PE', { ...options, timeZone: 'UTC' });
}

/** Formatea un instante (hora de ingreso, pagos, citaciones) en hora de Lima. */
export function formatLimaDateTime(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' },
): string {
  return new Date(date).toLocaleString('es-PE', { ...options, timeZone: SCHOOL_TIME_ZONE });
}
