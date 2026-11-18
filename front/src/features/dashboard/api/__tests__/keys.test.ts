import { describe, it, expect } from 'vitest';
import { dashboardKeys } from '../keys';

describe('dashboardKeys', () => {
  it.each([
    ['mySchoolOnboarding', dashboardKeys.mySchoolOnboarding, ['my-school-onboarding']],
  ])('matches original literal for %s', (_name, keyResult, expected) => {
    expect(keyResult).toEqual(expected);
  });
});

