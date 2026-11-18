export const classroomsKeys = {
  all: ['classrooms'] as const,
  list: (opts: { includeClosed?: boolean } = {}) => ['classrooms', opts] as const,
  byYear: (academicYearId?: string) => ['classrooms', 'year', academicYearId] as const,
} as const;

