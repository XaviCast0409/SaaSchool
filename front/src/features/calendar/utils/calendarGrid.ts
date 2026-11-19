import type { CalendarItem } from '../api/useCalendar';

export const pad = (n: number) => String(n).padStart(2, '0');

export const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

export const addDaysStr = (s: string, n: number) => {
  const d = new Date(`${s}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Celdas del mes (semanas de lunes a domingo). */
export function monthCells(year: number, month: number) {
  const first = ymd(year, month, 1);
  const firstWeekday = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7; // 0 = lunes
  const start = addDaysStr(first, -firstWeekday);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const total = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  return {
    start,
    end: addDaysStr(start, total - 1),
    cells: Array.from({ length: total }, (_, i) => addDaysStr(start, i)),
  };
}

/** Un evento de varios días aparece en cada día del rango. */
export function itemsByDay(items: CalendarItem[]) {
  const map = new Map<string, CalendarItem[]>();
  for (const it of items) {
    let d = it.date;
    const last = it.endDate ?? it.date;
    for (let guard = 0; d <= last && guard < 60; guard++, d = addDaysStr(d, 1))
      map.set(d, [...(map.get(d) ?? []), it]);
  }
  return map;
}
