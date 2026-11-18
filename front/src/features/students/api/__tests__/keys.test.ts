import { describe, it, expect } from 'vitest';
import { studentsKeys } from '../keys';

describe('studentsKeys', () => {
  it.each([
    ['all', studentsKeys.all, ['students']],
    ['list', studentsKeys.list({ search: 'Ana', page: 1 }), ['students', { search: 'Ana', page: 1 }]],
    ['detailAll', studentsKeys.detailAll, ['student']],
    ['detail', studentsKeys.detail('st-1'), ['student', 'st-1']],
    ['siagieCatalogs', studentsKeys.siagieCatalogs(), ['siagie-catalogs']],
    ['nominaMatricula', studentsKeys.nominaMatricula('c-1'), ['nomina-matricula', 'c-1']],
    ['myChildren', studentsKeys.myChildren(), ['my-children']],
    ['certificateEnrollment', studentsKeys.certificateEnrollment('st-1'), ['certificate-enrollment', 'st-1']],
    ['certificateNoDebt', studentsKeys.certificateNoDebt('st-1'), ['certificate-no-debt', 'st-1']],
  ])('matches original literal for %s', (_name, keyResult, expected) => {
    expect(keyResult).toEqual(expected);
  });
});

