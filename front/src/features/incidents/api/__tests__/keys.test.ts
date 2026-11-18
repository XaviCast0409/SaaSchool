import { describe, it, expect } from 'vitest';
import { incidentsKeys } from '../keys';

describe('incidentsKeys', () => {
  it.each([
    ['all', incidentsKeys.all, ['incidents']],
    ['list with filters', incidentsKeys.list({ page: 1 }), ['incidents', { page: 1 }]],
  ])('matches original literal for %s', (_name, keyResult, expected) => {
    expect(keyResult).toEqual(expected);
  });
});

