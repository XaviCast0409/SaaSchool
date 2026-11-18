import { describe, it, expect } from 'vitest';
import { schoolKeys } from '../keys';

describe('schoolKeys', () => {
  it.each([
    ['all', schoolKeys.all, ['school']],
    ['detail', schoolKeys.detail('sch-1'), ['school', 'sch-1']],
  ])('matches original literal for %s', (_name, keyResult, expected) => {
    expect(keyResult).toEqual(expected);
  });
});

