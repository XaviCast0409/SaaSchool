import { describe, it, expect } from 'vitest';
import { classroomsKeys } from '../keys';

describe('classroomsKeys', () => {
  it.each([
    ['all', classroomsKeys.all, ['classrooms']],
    ['list default', classroomsKeys.list(), ['classrooms', {}]],
    ['list includeClosed', classroomsKeys.list({ includeClosed: true }), ['classrooms', { includeClosed: true }]],
    ['byYear', classroomsKeys.byYear('ay-1'), ['classrooms', 'year', 'ay-1']],
  ])('matches original literal for %s', (_name, keyResult, expected) => {
    expect(keyResult).toEqual(expected);
  });
});

