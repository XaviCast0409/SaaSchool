export const academicKeys = {
  all: ['academic'] as const,
  sub: (key: string) => ['academic', key] as const,
  catalog: () => ['academic', 'catalog'] as const,
  setup: () => ['academic', 'setup'] as const,
  planAll: ['academic', 'plan'] as const,
  plan: (levelOrYearId?: string | null, grade?: number | string | null) =>
    grade !== undefined
      ? (['academic', 'plan', levelOrYearId, grade] as const)
      : (['academic', 'plan', levelOrYearId] as const),
  planPreuniversity: (levelOrYearId?: string | null, grade?: number | string | null) =>
    grade !== undefined
      ? (['academic', 'plan', 'preuniversity', levelOrYearId, grade] as const)
      : (['academic', 'plan', 'preuniversity', levelOrYearId] as const),
  loadAll: ['academic', 'load'] as const,
  load: (levelOrYearId?: string | null) => ['academic', 'load', levelOrYearId] as const,
  myCourses: (yearId?: string | null) =>
    yearId !== undefined
      ? (['academic', 'my-courses', yearId] as const)
      : (['academic', 'my-courses'] as const),
  periods: (yearId?: string | null) =>
    yearId !== undefined
      ? (['academic', 'periods', yearId] as const)
      : (['academic', 'periods'] as const),
  progressAll: ['academic', 'progress'] as const,
  progress: (periodNumber?: number | string | null, level?: string | null) =>
    ['academic', 'progress', periodNumber, level ?? 'ALL'] as const,
  progressMine: (periodNumber?: number | string | null) =>
    ['academic', 'progress', 'mine', periodNumber] as const,
  gradebookAll: ['academic', 'gradebook'] as const,
  gradebook: (assignmentId?: string | null, periodNumber?: number | string | null) =>
    ['academic', 'gradebook', assignmentId, periodNumber] as const,
  consolidationAll: ['academic', 'consolidation'] as const,
  consolidation: (classroomId?: string | null, period?: number | string | null) =>
    ['academic', 'consolidation', classroomId, period] as const,
  reportCard: (enrollmentId?: string | null, periodId?: string | number | null) =>
    periodId !== undefined
      ? (['academic', 'report-card', enrollmentId, periodId] as const)
      : (['academic', 'report-card', enrollmentId] as const),
  reportCards: (classroomId?: string | null, periodId?: string | number | null) =>
    periodId !== undefined
      ? (['academic', 'report-cards', classroomId, periodId] as const)
      : (['academic', 'report-cards', classroomId] as const),
  phrasesAll: ['academic', 'phrases'] as const,
  phrases: (assignmentId?: string | null) => ['academic', 'phrases', assignmentId] as const,
  phrasesManage: (levelOrClassroomId?: string | null, cnebNumber?: number | string | null, courseKey?: string | null) =>
    cnebNumber !== undefined || courseKey !== undefined
      ? (['academic', 'phrases', 'manage', levelOrClassroomId, cnebNumber, courseKey] as const)
      : (['academic', 'phrases', 'manage', levelOrClassroomId] as const),
  tutorReportAll: ['academic', 'tutor-report'] as const,
  tutorReport: (classroomId?: string | null, periodNumber?: number | string | null) =>
    ['academic', 'tutor-report', classroomId, periodNumber] as const,
} as const;
