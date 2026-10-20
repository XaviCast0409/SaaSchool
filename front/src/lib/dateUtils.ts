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
 * Formatea una fecha 'YYYY-MM-DD' o ISO en texto legible en español para Perú.
 * Evita desfaces por desfase de horas UTC interpretando día/mes/año locales.
 * Ej: 'lunes, 19 de octubre de 2026' o '19/10/2026'
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

  let safeDate: Date;
  if (typeof dateInput === 'string') {
    const clean = dateInput.split('T')[0];
    const parts = clean.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      // Usar mediodía local para ser inmune a saltos de día por husos horarios
      safeDate = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    } else {
      safeDate = new Date(dateInput);
    }
  } else {
    safeDate = dateInput;
  }

  if (isNaN(safeDate.getTime())) return '—';

  return new Intl.DateTimeFormat('es-PE', {
    timeZone: TIMEZONE_PERU,
    ...options,
  }).format(safeDate);
}
