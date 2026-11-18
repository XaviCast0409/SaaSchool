import { describe, it, expect } from 'vitest';
import { authKeys } from '../keys';

describe('authKeys', () => {
  it.each([
    ['schoolLoginPage', authKeys.schoolLoginPage('demo'), ['school-login-page', 'demo']],
  ])('matches original literal for %s', (_name, keyResult, expected) => {
    expect(keyResult).toEqual(expected);
  });
});

