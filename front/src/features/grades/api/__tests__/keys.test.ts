import { describe, it, expect } from 'vitest';
import { gradesKeys } from '../keys';

describe('gradesKeys', () => {
  it.each([
    ['evaluationCriteriaAll', gradesKeys.evaluationCriteriaAll, ['evaluation-criteria']],
    ['evaluationCriteria', gradesKeys.evaluationCriteria('PRIMARY'), ['evaluation-criteria', 'PRIMARY']],
    ['gradingScaleAll', gradesKeys.gradingScaleAll, ['grading-scale']],
    ['gradingScale', gradesKeys.gradingScale('SECONDARY'), ['grading-scale', 'SECONDARY']],
  ])('matches original literal for %s', (_name, keyResult, expected) => {
    expect(keyResult).toEqual(expected);
  });
});

