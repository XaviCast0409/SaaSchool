export const courseAttendanceKeys = {
  all: ['course-attendance'] as const,
  session: (courseAssignmentId?: string | null, date?: string | null, periodLabel?: string | null) =>
    ['course-attendance', 'session', courseAssignmentId, date, periodLabel] as const,
  summaryAll: (courseAssignmentId?: string | null) =>
    ['course-attendance', 'summary', courseAssignmentId] as const,
  summary: (courseAssignmentId?: string | null, month?: string | null) =>
    ['course-attendance', 'summary', courseAssignmentId, month] as const,
} as const;

