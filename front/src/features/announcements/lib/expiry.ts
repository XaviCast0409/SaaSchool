import { getPeruToday } from '@/lib/dateUtils';

/** Igual que en el backend: un comunicado sin fecha pasa a "Anteriores" a los 60 días. */
export const UNDATED_ARCHIVE_DAYS = 60;

/** Suma días a una fecha 'YYYY-MM-DD' (sin tocar zonas horarias). */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Último segundo del día indicado en hora de Lima, como instante ISO. */
export function endOfDayLima(isoDate: string): string {
  return new Date(`${isoDate}T23:59:59-05:00`).toISOString();
}

/** Fecha de Lima 'YYYY-MM-DD' de un instante ISO (para precargar un input date). */
export function limaDateOf(iso: string): string {
  return getPeruToday(new Date(iso));
}

export interface ExpiryPreset {
  id: string;
  label: string;
  /** '' = sin fecha */
  value: string;
}

export function expiryPresets(today: string, responseDeadline?: string): ExpiryPreset[] {
  const presets: ExpiryPreset[] = [
    { id: 'week', label: '1 semana', value: addDays(today, 7) },
    { id: 'month', label: '1 mes', value: addDays(today, 30) },
  ];
  if (responseDeadline) presets.push({ id: 'deadline', label: 'Hasta la fecha límite', value: responseDeadline });
  presets.push({ id: 'none', label: 'Sin fecha', value: '' });
  return presets;
}
