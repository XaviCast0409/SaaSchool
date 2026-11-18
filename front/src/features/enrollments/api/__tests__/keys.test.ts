import { describe, it, expect } from 'vitest';
import { enrollmentsKeys } from '../keys';

describe('enrollmentsKeys', () => {
  it.each([
    ['all', enrollmentsKeys.all, ['enrollments']],
    ['rolloverCandidatesAll', enrollmentsKeys.rolloverCandidatesAll, ['rollover-candidates']],
    [
      'rolloverCandidates',
      enrollmentsKeys.rolloverCandidates({ fromAcademicYearId: 'ay-1', toAcademicYearId: 'ay-2' }),
      ['rollover-candidates', { fromAcademicYearId: 'ay-1', toAcademicYearId: 'ay-2' }],
    ],
  ])('matches original literal for %s', (_name, keyResult, expected) => {
    expect(keyResult).toEqual(expected);
  });
});

