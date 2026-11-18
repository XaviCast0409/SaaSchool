import { describe, it, expect } from 'vitest';
import { usersKeys } from '../keys';

describe('usersKeys', () => {
  it.each([
    ['all', usersKeys.all, ['users']],
    ['list', usersKeys.list({ role: 'TEACHER' }), ['users', { role: 'TEACHER' }]],
    ['familiesAll', usersKeys.familiesAll, ['users', 'families']],
    ['families', usersKeys.families({ search: 'Perez', page: 1, limit: 10 }), ['users', 'families', { search: 'Perez', page: 1, limit: 10 }]],
    ['renew', usersKeys.renew('u-1'), ['users', 'renew', 'u-1']],
    ['staffLoad', usersKeys.staffLoad, ['staff-load']],
    ['teacherReplacementsAll', usersKeys.teacherReplacementsAll, ['teacher-replacements']],
    ['teacherReplacementsPreview', usersKeys.teacherReplacementsPreview('t-1'), ['teacher-replacements', 'preview', 't-1']],
    ['teacherReplacementsList', usersKeys.teacherReplacementsList(), ['teacher-replacements', 'list']],
  ])('matches original literal for %s', (_name, keyResult, expected) => {
    expect(keyResult).toEqual(expected);
  });
});

