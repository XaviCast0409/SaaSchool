import { describe, it, expect } from 'vitest';
import { getPeruCurrentMonth, getPeruToday, getPeruTodayParts, isDateOnlyValue } from '../dateUtils';

describe('fechas en hora de Perú (UTC-5)', () => {
  it('a las 22:00 en Lima sigue siendo el mismo día aunque en UTC ya sea el siguiente', () => {
    const lima22h = new Date('2026-11-17T03:00:00Z'); // 16/11 22:00 en Lima
    expect(getPeruToday(lima22h)).toBe('2026-11-16');
    expect(getPeruTodayParts(lima22h)).toEqual({ year: 2026, month: 11, day: 16 });
  });

  it('cambio de mes según Lima', () => {
    expect(getPeruCurrentMonth(new Date('2026-12-01T04:59:00Z'))).toBe('2026-11');
    expect(getPeruCurrentMonth(new Date('2026-12-01T05:00:00Z'))).toBe('2026-12');
  });

  it('detecta valores de solo fecha', () => {
    expect(isDateOnlyValue('2026-11-16')).toBe(true);
  });
});
