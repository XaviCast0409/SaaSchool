import type { PeriodInfo } from '../types';

/** Fecha de hoy (YYYY-MM-DD) en hora de Lima, igual que el backend. */
const todayInLima = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

/**
 * Periodo que conviene abrir por defecto: el que contiene la fecha de hoy; si hoy cae en
 * vacaciones, el último que ya empezó; si el año aún no empieza, el primero sin cerrar.
 */
export function currentPeriodNumber(
  periods: Pick<PeriodInfo, 'periodNumber' | 'startDate' | 'endDate' | 'status'>[],
): number {
  if (periods.length === 0) return 1;
  const today = todayInLima();
  const key = (d: string) => d.slice(0, 10);
  const inside = periods.find((p) => key(p.startDate) <= today && today <= key(p.endDate));
  if (inside) return inside.periodNumber;
  const started = periods.filter((p) => key(p.startDate) <= today);
  if (started.length > 0) return started[started.length - 1].periodNumber;
  return periods.find((p) => p.status !== 'CLOSED')?.periodNumber ?? periods[0].periodNumber;
}
