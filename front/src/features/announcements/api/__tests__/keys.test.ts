import { describe, it, expect } from 'vitest';
import { announcementsKeys } from '../keys';

describe('announcementsKeys', () => {
  it.each([
    ['all', announcementsKeys.all, ['announcements']],
    ['list', announcementsKeys.list({ page: 1 }), ['announcements', { page: 1 }]],
    ['responses', announcementsKeys.responses('a-1'), ['announcements', 'responses', 'a-1']],
  ])('matches original literal for %s', (_name, keyResult, expected) => {
    expect(keyResult).toEqual(expected);
  });
});

