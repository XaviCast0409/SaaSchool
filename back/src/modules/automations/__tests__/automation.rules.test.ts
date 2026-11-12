import { describe, it, expect } from 'vitest';
import { isJobDue, isInQuietHours, addDays, limaDayRange, isValidTime, monthDayKey, formatLongDate } from '../automation.rules';

describe('isJobDue', () => {
  const base = { nowTime: '08:00', weekday: 3, isHoliday: false };

  it('corre desde su hora programada', () => {
    expect(isJobDue({ ...base, schedule: { time: '08:00' } })).toBe(true);
    expect(isJobDue({ ...base, nowTime: '07:59', schedule: { time: '08:00' } })).toBe(false);
  });

  it('recupera un trabajo atrasado si el servidor se reinició, pero no de noche', () => {
    expect(isJobDue({ ...base, nowTime: '14:30', schedule: { time: '08:00' } })).toBe(true);
    expect(isJobDue({ ...base, nowTime: '21:00', schedule: { time: '08:00' } })).toBe(false);
  });

  it('respeta los días de la semana', () => {
    expect(isJobDue({ ...base, nowTime: '18:00', weekday: 0, schedule: { time: '18:00', weekdays: [0] } })).toBe(true);
    expect(isJobDue({ ...base, nowTime: '18:00', weekday: 1, schedule: { time: '18:00', weekdays: [0] } })).toBe(false);
  });

  it('solo días lectivos excluye fines de semana y feriados', () => {
    const schedule = { time: '08:00', schoolDaysOnly: true };
    expect(isJobDue({ ...base, schedule })).toBe(true);
    expect(isJobDue({ ...base, weekday: 6, schedule })).toBe(false);
    expect(isJobDue({ ...base, isHoliday: true, schedule })).toBe(false);
  });
});

describe('isInQuietHours', () => {
  it('sin rango no silencia', () => expect(isInQuietHours('23:00', null, null)).toBe(false));
  it('rango en el mismo día', () => {
    expect(isInQuietHours('13:30', '13:00', '15:00')).toBe(true);
    expect(isInQuietHours('15:00', '13:00', '15:00')).toBe(false);
  });
  it('rango que cruza medianoche', () => {
    expect(isInQuietHours('22:00', '21:00', '07:00')).toBe(true);
    expect(isInQuietHours('06:59', '21:00', '07:00')).toBe(true);
    expect(isInQuietHours('07:00', '21:00', '07:00')).toBe(false);
    expect(isInQuietHours('12:00', '21:00', '07:00')).toBe(false);
  });
});

describe('fechas', () => {
  it('addDays cruza meses y años', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('limaDayRange cubre el día local de Lima (UTC-5)', () => {
    const r = limaDayRange('2026-11-15');
    expect(r.gte.toISOString()).toBe('2026-11-15T05:00:00.000Z');
    expect(r.lt.toISOString()).toBe('2026-11-16T05:00:00.000Z');
  });
  it('isValidTime', () => {
    expect(isValidTime('07:30')).toBe(true);
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('7:30')).toBe(false);
  });
  it('monthDayKey', () => expect(monthDayKey(new Date('2015-11-15T00:00:00.000Z'))).toBe('11-15'));
  it('formatLongDate en español', () => expect(formatLongDate('2026-11-13')).toMatch(/viernes.*13.*noviembre/));
});
