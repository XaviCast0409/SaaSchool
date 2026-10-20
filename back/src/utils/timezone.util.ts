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

export function getSchoolNow(timeZone: string = 'America/Lima'): SchoolNowResult {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
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
    fullDate: now,
  };
}

export function parseSchoolDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}
