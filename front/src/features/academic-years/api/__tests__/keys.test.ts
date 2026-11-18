import { describe, it, expect } from 'vitest';
import { academicYearsKeys } from '../keys';

describe('academicYearsKeys', () => {
  it.each([
    ['all', academicYearsKeys.all, ['academic-years']],
    ['activationImpact', academicYearsKeys.activationImpact('ay-1'), ['academic-years', 'activation-impact', 'ay-1']],
  ])('matches original literal for %s', (_name, keyResult, expected) => {
    expect(keyResult).toEqual(expected);
  });
});

