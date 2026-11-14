/**
 * Recuerda el código del último colegio con el que se ingresó en este navegador,
 * para que la familia no tenga que escribirlo cada vez. Es solo una comodidad:
 * si el almacenamiento no está disponible, la página pide el código de nuevo.
 */
const KEY = 'saaschool:last-school-code';

export const getLastSchoolCode = (): string | null => {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const setLastSchoolCode = (code: string): void => {
  try {
    window.localStorage.setItem(KEY, code);
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
};

export const clearLastSchoolCode = (): void => {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
};

/** Mismo formato que valida el backend: minúsculas, números y guiones (3 a 40). */
export const normalizeSchoolCode = (value: string): string => value.trim().toLowerCase();
export const isSchoolCodeFormat = (value: string): boolean =>
  /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/.test(value) && !value.includes('--');
