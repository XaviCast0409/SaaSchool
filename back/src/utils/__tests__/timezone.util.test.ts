import { describe, it, expect } from 'vitest';
import { dateOnlyKey, formatDateOnly, formatLimaDateTime, getSchoolTimeParts, monthRangeUTC } from '../timezone.util';
import { getPeriodDateRange } from '../period-dates.util';

describe('Hora peruana (America/Lima, UTC-5)', () => {
  it('a las 22:30 de Lima ya es el día siguiente en UTC, pero el colegio sigue en su día', () => {
    const p = getSchoolTimeParts(new Date('2026-11-12T03:30:00Z'));
    expect(p.dateStr).toBe('2026-11-11');
    expect(p.hour).toBe(22);
    expect(p.minute).toBe(30);
  });

  it('medianoche de Lima se reporta como hora 0, nunca 24', () => {
    expect(getSchoolTimeParts(new Date('2026-11-12T05:00:00Z')).hour).toBe(0);
  });

  it('el rango de un mes cubre del día 1 al último día en columnas de solo fecha', () => {
    const r = monthRangeUTC('2026-02');
    expect(r.startDate.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(r.endDate.toISOString()).toBe('2026-02-28T23:59:59.999Z');
    expect(r.daysInMonth).toBe(28);
  });

  it('las fechas sin hora no se corren un día', () => {
    expect(formatDateOnly(new Date('2026-03-10T00:00:00Z'))).toBe('10/03/2026');
    expect(dateOnlyKey(new Date('2026-03-10T00:00:00Z'))).toBe('2026-03-10');
  });

  it('los instantes se muestran en hora de Lima', () => {
    expect(formatLimaDateTime(new Date('2026-11-12T03:30:00Z'), { hour: '2-digit', minute: '2-digit', hour12: false })).toBe('22:30');
  });

  it('el fin de un periodo no incluye el día siguiente', () => {
    const r = getPeriodDateRange({ startDate: '2026-03-09', endDate: '2026-12-18', periodsConfig: [{ periodNumber: 1, startDate: '2026-03-09', endDate: '2026-05-08' }] }, 1);
    expect(r.endDate.toISOString()).toBe('2026-05-08T23:59:59.999Z');
  });
});
