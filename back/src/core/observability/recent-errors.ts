/**
 * Últimos errores no controlados (500) del proceso, en memoria, para el panel de salud del SuperAdmin.
 * No reemplaza a Sentry: se pierde al reiniciar y solo guarda lo mínimo (sin cuerpo ni query string).
 */
export interface RecentServerError {
  at: string;
  method: string;
  path: string;
  message: string;
}

const MAX_ERRORS = 50;
const MAX_MESSAGE = 300;
const buffer: RecentServerError[] = [];

export function recordServerError(entry: { method?: string; path?: string; message?: string }, now: Date = new Date()): void {
  buffer.unshift({
    at: now.toISOString(),
    method: entry.method ?? '?',
    // Sin query string: puede traer datos personales (DNI, búsquedas)
    path: (entry.path ?? '?').split('?')[0],
    message: (entry.message || 'Error sin mensaje').slice(0, MAX_MESSAGE),
  });
  if (buffer.length > MAX_ERRORS) buffer.length = MAX_ERRORS;
}

export const getRecentServerErrors = (): RecentServerError[] => [...buffer];

/** Solo para tests */
export const clearRecentServerErrors = (): void => {
  buffer.length = 0;
};
