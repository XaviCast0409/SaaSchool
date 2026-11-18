import { describe, it, expect } from 'vitest';
import { courseAttendanceKeys } from '../keys';

describe('courseAttendanceKeys', () => {
  it.each([
    ['all', courseAttendanceKeys.all, ['course-attendance']],
    ['session', courseAttendanceKeys.session('ca-1', '2026-03-01', '1'), ['course-attendance', 'session', 'ca-1', '2026-03-01', '1']],
    ['summaryAll', courseAttendanceKeys.summaryAll('ca-1'), ['course-attendance', 'summary', 'ca-1']],
    ['summary', courseAttendanceKeys.summary('ca-1', '2026-03'), ['course-attendance', 'summary', 'ca-1', '2026-03']],
  ])('matches original literal for %s', (_name, keyResult, expected) => {
    expect(keyResult).toEqual(expected);
  });
});

