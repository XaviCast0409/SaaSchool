import { describe, it, expect } from 'vitest';
import { auditLogsKeys } from '../keys';

describe('auditLogsKeys', () => {
  it.each([
    ['all', auditLogsKeys.all, ['audit-logs']],
    ['list', auditLogsKeys.list({ page: 1 }), ['audit-logs', { page: 1 }]],
    ['categories', auditLogsKeys.categories(), ['audit-logs', 'categories']],
    ['actors', auditLogsKeys.actors(), ['audit-logs', 'actors']],
  ])('matches original literal for %s', (_name, keyResult, expected) => {
    expect(keyResult).toEqual(expected);
  });
});

