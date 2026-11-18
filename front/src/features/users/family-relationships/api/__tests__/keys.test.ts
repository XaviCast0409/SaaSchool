import { describe, it, expect } from 'vitest';
import { familyRelationshipsKeys } from '../keys';

describe('familyRelationshipsKeys', () => {
  it.each([
    ['all', familyRelationshipsKeys.all, ['family-relationships']],
    ['studentParentsAll', familyRelationshipsKeys.studentParentsAll, ['student-parents']],
    ['studentParents', familyRelationshipsKeys.studentParents('st-1'), ['student-parents', 'st-1']],
    ['parentStudentsAll', familyRelationshipsKeys.parentStudentsAll, ['parent-students']],
    ['parentStudents', familyRelationshipsKeys.parentStudents('u-1'), ['parent-students', 'u-1']],
  ])('matches original literal for %s', (_name, keyResult, expected) => {
    expect(keyResult).toEqual(expected);
  });
});

