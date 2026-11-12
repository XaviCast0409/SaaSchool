/**
 * Utilidades de fecha y hora estandarizadas para la zona horaria de Perú (America/Lima, UTC-5).
 * Elimina cualquier desfase provocado por servidores en UTC o cambios de día pasadas las 19:00 hrs.
 */

export const TIMEZONE_PERU = 'America/Lima';

/**
 * Retorna la fecha actual en Perú como string 'YYYY-MM-DD'.
 */
export function getPeruToday(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_PERU,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Retorna el mes actual en Perú como string 'YYYY-MM'.
 */
export function getPeruCurrentMonth(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_PERU,
    year: 'numeric',
    month: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Formatea una hora en la zona horaria de Perú (ej: '07:45' o '19:30').
 */
export function formatPeruTime(
  dateInput: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';

  return new Intl.DateTimeFormat('es-PE', {
    timeZone: TIMEZONE_PERU,
    ...options,
  }).format(d);
}

/**
 * Indica si un valor es una fecha SIN hora: 'YYYY-MM-DD' o un instante exactamente a medianoche UTC
 * (así llegan del servidor los vencimientos, cumpleaños, fechas de asistencia y feriados).
 * Esas fechas se muestran en UTC para que no se corran un día al verlas en hora peruana.
 */
export function isDateOnlyValue(value: string | Date): boolean {
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return true;
    return /T00:00:00(\.000)?Z$/.test(value);
  }
  return value.getUTCHours() === 0 && value.getUTCMinutes() === 0 && value.getUTCSeconds() === 0 && value.getUTCMilliseconds() === 0;
}

function toDate(value: string | Date): Date {
  if (typeof value !== 'string') return value;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : new Date(value);
}

/**
 * Formatea una fecha en español de Perú. Ej: 'lunes, 19 de octubre de 2026'.
 * - Fecha sin hora: se muestra el mismo día guardado.
 * - Instante (fecha y hora): se convierte a la hora de Lima.
 */
export function formatPeruDate(
  dateInput: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }
): string {
  if (!dateInput) return '—';
  const d = toDate(dateInput);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-PE', {
    ...options,
    timeZone: isDateOnlyValue(dateInput) ? 'UTC' : TIMEZONE_PERU,
  }).format(d);
}

/** Fecha corta 'dd/mm/aaaa' (misma regla que formatPeruDate). */
export function formatPeruShortDate(dateInput: string | Date | null | undefined): string {
  return formatPeruDate(dateInput, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Fecha y hora de un instante, siempre en hora de Lima. Ej: '12/11/2026, 08:15'. */
export function formatPeruDateTime(
  dateInput: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
): string {
  if (!dateInput) return '—';
  const d = toDate(dateInput);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-PE', { ...options, timeZone: TIMEZONE_PERU }).format(d);
}

/** Partes de la fecha actual en Lima (año, mes 1-12, día). */
export function getPeruTodayParts(date: Date = new Date()): { year: number; month: number; day: number } {
  const [year, month, day] = getPeruToday(date).split('-').map(Number);
  return { year, month, day };
}
