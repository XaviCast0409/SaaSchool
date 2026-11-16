import { describe, it, expect } from 'vitest';
import { weeklyDates } from '../meeting.rules';

describe('entrevistas: repetir horarios cada semana', () => {
  it('una semana devuelve solo el día elegido', () => {
    expect(weeklyDates('2026-11-17', 1)).toEqual(['2026-11-17']);
  });

  it('repite el mismo día de la semana, cruzando de mes', () => {
    expect(weeklyDates('2026-11-17', 3)).toEqual(['2026-11-17', '2026-11-24', '2026-12-01']);
  });

  it('cruza de año sin desfasarse', () => {
    expect(weeklyDates('2026-12-29', 2)).toEqual(['2026-12-29', '2027-01-05']);
  });
});
