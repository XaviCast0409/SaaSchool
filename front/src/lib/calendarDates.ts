export const SPANISH_MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Setiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const SPANISH_DAYS_SHORT = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

export function formatMonthSpanish(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  const monthName = SPANISH_MONTHS[monthNum - 1] || '';
  return `${monthName} ${year}`.trim();
}

export function getDayInfo(
  year: number,
  month: number,
  day: number,
): { short: string; isWeekend: boolean; isSunday: boolean } {
  const date = new Date(year, month - 1, day);
  const dayIndex = date.getDay();
  return {
    short: SPANISH_DAYS_SHORT[dayIndex] || '',
    isWeekend: dayIndex === 0 || dayIndex === 6,
    isSunday: dayIndex === 0,
  };
}

export function isWeekendDate(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  const dayIndex = date.getDay();
  return dayIndex === 0 || dayIndex === 6;
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthNum] = month.split('-').map(Number);
  const date = new Date(year, monthNum - 1 + delta, 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
