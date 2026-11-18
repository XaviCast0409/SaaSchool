import { describe, it, expect } from 'vitest';
import { courseAssignmentsKeys } from '../keys';

describe('courseAssignmentsKeys', () => {
  it.each([
    ['all', courseAssignmentsKeys.all, ['course-assignments']],
    ['list', courseAssignmentsKeys.list('sch-1'), ['course-assignments', 'sch-1']],
    ['myCourses', courseAssignmentsKeys.myCourses('u-1', 'sch-1'), ['course-assignments', 'my-courses', 'u-1', 'sch-1']],
  ])('matches original literal for %s', (_name, keyResult, expected) => {
    expect(keyResult).toEqual(expected);
  });
});

