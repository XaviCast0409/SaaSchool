import { describe, it, expect } from 'vitest';
import {
  SPANISH_MONTHS,
  SPANISH_DAYS_SHORT,
  formatMonthSpanish,
  getDayInfo,
  isWeekendDate,
  shiftMonth,
} from '../calendarDates';

describe('calendarDates constants', () => {
  it('defines SPANISH_MONTHS with Setiembre', () => {
    expect(SPANISH_MONTHS).toHaveLength(12);
    expect(SPANISH_MONTHS[8]).toBe('Setiembre');
  });

  it('defines SPANISH_DAYS_SHORT starting on DOM', () => {
    expect(SPANISH_DAYS_SHORT).toEqual(['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']);
  });
});

describe('formatMonthSpanish', () => {
  it('formats YYYY-MM as Month YYYY', () => {
    expect(formatMonthSpanish('2026-09')).toBe('Setiembre 2026');
  });
});

describe('shiftMonth', () => {
  it('shifts month forwards across year boundary', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  it('shifts month backwards across year boundary', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });
});

describe('getDayInfo & isWeekendDate', () => {
  it('returns weekend info for Sunday', () => {
    expect(getDayInfo(2026, 11, 15)).toEqual({
      short: 'DOM',
      isWeekend: true,
      isSunday: true,
    });
    expect(isWeekendDate(2026, 11, 15)).toBe(true);
  });

  it('returns short name for Tuesday', () => {
    expect(getDayInfo(2026, 11, 17).short).toBe('MAR');
    expect(isWeekendDate(2026, 11, 17)).toBe(false);
  });
});
