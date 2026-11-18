import { describe, it, expect } from 'vitest';
import { secretariatKeys } from '../keys';

describe('secretariatKeys', () => {
  it.each([
    ['all', secretariatKeys.all, ['secretariat']],
    ['settings', secretariatKeys.settings(), ['secretariat', 'settings']],
    ['admissions', secretariatKeys.admissions({ page: 1 }), ['secretariat', 'admissions', { page: 1 }]],
    ['ratifications', secretariatKeys.ratifications(), ['secretariat', 'ratifications']],
    ['documents', secretariatKeys.documents('PENDING'), ['secretariat', 'documents', 'PENDING']],
    ['complaints', secretariatKeys.complaints(), ['secretariat', 'complaints']],
    ['family', secretariatKeys.family(), ['secretariat', 'family']],
    ['publicSchool', secretariatKeys.publicSchool('sch-1'), ['public-school', 'sch-1']],
  ])('matches original literal for %s', (_name, keyResult, expected) => {
    expect(keyResult).toEqual(expected);
  });
});

