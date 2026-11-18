import { describe, it, expect } from 'vitest';
import { academicReportsKeys } from '../keys';

describe('academicReportsKeys', () => {
  it.each([
    ['all', academicReportsKeys.all, ['academic-reports']],
    ['classrooms', academicReportsKeys.classrooms('y-1'), ['academic-reports', 'classrooms', 'y-1']],
    ['report0021', academicReportsKeys.report0021('c-1', 1), ['academic-reports', '0021', 'c-1', 1]],
    ['report0041', academicReportsKeys.report0041('c-1', 'ca-1'), ['academic-reports', '0041', 'c-1', 'ca-1']],
    ['report0048', academicReportsKeys.report0048('c-1', 2), ['academic-reports', '0048', 'c-1', 2]],
    ['report0049', academicReportsKeys.report0049('PRIMARY', 3, 1), ['academic-reports', '0049', 'PRIMARY', 3, 1]],
    ['report0030', academicReportsKeys.report0030('c-1', 1), ['academic-reports', '0030', 'c-1', 1]],
    ['report0011', academicReportsKeys.report0011('c-1'), ['academic-reports', '0011', 'c-1']],
    ['report0001', academicReportsKeys.report0001('ACTIVE', 'y-1'), ['academic-reports', '0001', 'ACTIVE', 'y-1']],
    ['report0002', academicReportsKeys.report0002('c-1', 'y-1'), ['academic-reports', '0002', 'c-1', 'y-1']],
    ['report0003', academicReportsKeys.report0003('c-1', 'y-1'), ['academic-reports', '0003', 'c-1', 'y-1']],
    ['report0019', academicReportsKeys.report0019('2026-03', 'c-1', 'PRIMARY', 'y-1'), ['academic-reports', '0019', '2026-03', 'c-1', 'PRIMARY', 'y-1']],
    ['byCode', academicReportsKeys.byCode('0021', 'c-1'), ['academic-reports', '0021', 'c-1']],
  ])('matches original literal for %s', (_name, keyResult, expected) => {
    expect(keyResult).toEqual(expected);
  });
});

