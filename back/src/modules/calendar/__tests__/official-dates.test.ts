import { describe, it, expect } from 'vitest';
import { civicDates, easterSunday, nationalHolidays, withinRange } from '../official-dates';

describe('fechas oficiales', () => {
  it('calcula el domingo de Pascua', () => {
    expect(easterSunday(2025)).toBe('2025-04-20');
    expect(easterSunday(2026)).toBe('2026-04-05');
    expect(easterSunday(2027)).toBe('2027-03-28');
  });

  it('incluye Semana Santa y los feriados nacionales vigentes', () => {
    const h = nationalHolidays(2026);
    expect(h.find((x) => x.name === 'Jueves Santo')?.date).toBe('2026-04-02');
    expect(h.find((x) => x.name === 'Viernes Santo')?.date).toBe('2026-04-03');
    expect(h.some((x) => x.date === '2026-12-09')).toBe(true);
    expect(h.some((x) => x.date === '2026-06-07')).toBe(true);
    expect(h).toHaveLength(16);
    expect([...h].map((x) => x.date)).toEqual([...h].map((x) => x.date).sort());
  });

  it('filtra por el rango del año lectivo', () => {
    const inYear = withinRange(civicDates(2026), '2026-03-02', '2026-12-18');
    expect(inYear.some((x) => x.name === 'Día del Maestro')).toBe(true);
    expect(withinRange(nationalHolidays(2026), '2026-03-02', '2026-12-18').some((x) => x.date === '2026-01-01')).toBe(false);
  });
});
