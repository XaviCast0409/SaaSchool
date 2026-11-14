/**
 * Fechas oficiales del Perú para precargar el calendario escolar.
 * - Feriados nacionales (Ley 31788 y normas que añadieron 7 jun, 23 jul, 6 ago y 9 dic) + Semana Santa.
 * - Fechas del calendario cívico escolar más usadas en las II. EE. (no son feriados: son actividades).
 * El colegio puede quitar las que no aplique (p. ej. feriados regionales o locales los agrega a mano).
 */

export interface OfficialDate {
  date: string; // YYYY-MM-DD
  name: string;
}

/** Domingo de Pascua (algoritmo anónimo gregoriano / Meeus). */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function shift(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const FIXED_HOLIDAYS: Array<[string, string]> = [
  ['01-01', 'Año Nuevo'],
  ['05-01', 'Día del Trabajo'],
  ['06-07', 'Batalla de Arica y Día de la Bandera'],
  ['06-29', 'San Pedro y San Pablo'],
  ['07-23', 'Día de la Fuerza Aérea del Perú'],
  ['07-28', 'Fiestas Patrias'],
  ['07-29', 'Fiestas Patrias'],
  ['08-06', 'Batalla de Junín'],
  ['08-30', 'Santa Rosa de Lima'],
  ['10-08', 'Combate de Angamos'],
  ['11-01', 'Día de Todos los Santos'],
  ['12-08', 'Inmaculada Concepción'],
  ['12-09', 'Batalla de Ayacucho'],
  ['12-25', 'Navidad'],
];

export function nationalHolidays(year: number): OfficialDate[] {
  const easter = easterSunday(year);
  return [
    ...FIXED_HOLIDAYS.map(([md, name]) => ({ date: `${year}-${md}`, name })),
    { date: shift(easter, -3), name: 'Jueves Santo' },
    { date: shift(easter, -2), name: 'Viernes Santo' },
  ].sort((a, b) => a.date.localeCompare(b.date));
}

const CIVIC: Array<[string, string]> = [
  ['03-08', 'Día Internacional de la Mujer'],
  ['03-22', 'Día Mundial del Agua'],
  ['04-22', 'Día de la Tierra'],
  ['04-23', 'Día del Idioma Español y del Libro'],
  ['05-25', 'Día de la Educación Inicial'],
  ['05-27', 'Día de las Lenguas Originarias'],
  ['06-05', 'Día Mundial del Medio Ambiente'],
  ['06-24', 'Día del Campesino'],
  ['07-06', 'Día del Maestro'],
  ['08-22', 'Día del Folclore'],
  ['09-23', 'Día de la Primavera y de la Juventud'],
  ['10-31', 'Día de la Canción Criolla'],
  ['11-20', 'Día de los Derechos del Niño'],
];

export function civicDates(year: number): OfficialDate[] {
  return CIVIC.map(([md, name]) => ({ date: `${year}-${md}`, name }));
}

/** Solo las fechas dentro del año lectivo (inicio y fin incluidos). */
export function withinRange(dates: OfficialDate[], start: string, end: string): OfficialDate[] {
  return dates.filter((d) => d.date >= start && d.date <= end);
}
