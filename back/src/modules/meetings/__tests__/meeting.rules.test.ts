import { describe, it, expect } from 'vitest';
import { generateSlots, limaDateTime, overlaps, withoutOverlaps, hasMinimumNotice } from '../meeting.rules';

describe('agenda de entrevistas', () => {
  it('limaDateTime convierte hora de Lima (UTC-5) a UTC', () => {
    expect(limaDateTime('2026-11-17', '14:00').toISOString()).toBe('2026-11-17T19:00:00.000Z');
  });
  it('genera espacios consecutivos y descarta el sobrante', () => {
    const slots = generateSlots('2026-11-17', '14:00', '15:10', 20);
    expect(slots).toHaveLength(3);
    expect(slots[2].endsAt.toISOString()).toBe('2026-11-17T20:00:00.000Z');
  });
  it('detecta cruces de horario', () => {
    const a = limaDateTime('2026-11-17', '14:00');
    const b = limaDateTime('2026-11-17', '14:20');
    const c = limaDateTime('2026-11-17', '14:40');
    expect(overlaps(a, b, b, c)).toBe(false);
    expect(overlaps(a, c, b, c)).toBe(true);
  });
  it('no duplica horarios ya publicados', () => {
    const fresh = generateSlots('2026-11-17', '14:00', '15:00', 20);
    const existing = [{ startsAt: limaDateTime('2026-11-17', '14:20'), endsAt: limaDateTime('2026-11-17', '14:40') }];
    expect(withoutOverlaps(fresh, existing)).toHaveLength(2);
  });
  it('exige anticipación mínima', () => {
    const now = new Date('2026-11-17T12:00:00Z');
    expect(hasMinimumNotice(new Date('2026-11-17T13:59:00Z'), 2, now)).toBe(false);
    expect(hasMinimumNotice(new Date('2026-11-17T14:00:00Z'), 2, now)).toBe(true);
  });
});
