import { describe, it, expect } from 'vitest';
import { legalKeys } from '../keys';

describe('legalKeys', () => {
  it.each([
    ['status', legalKeys.status, ['legal-status']],
  ])('matches original literal for %s', (_name, keyResult, expected) => {
    expect(keyResult).toEqual(expected);
  });
});

