export const academicReportsKeys = {
  all: ['academic-reports'] as const,
  classrooms: (academicYearId?: string | null) => ['academic-reports', 'classrooms', academicYearId] as const,
  report0021: (classroomId?: string | null, periodNumber?: number | string | null) =>
    ['academic-reports', '0021', classroomId, periodNumber] as const,
  report0041: (classroomId?: string | null, courseAssignmentId?: string | null) =>
    ['academic-reports', '0041', classroomId, courseAssignmentId] as const,
  report0048: (classroomId?: string | null, periodNumber?: number | string | null) =>
    ['academic-reports', '0048', classroomId, periodNumber] as const,
  report0049: (educationLevel?: string | null, grade?: number | string | null, periodNumber?: number | string | null) =>
    ['academic-reports', '0049', educationLevel, grade, periodNumber] as const,
  report0030: (classroomId?: string | null, periodNumber?: number | string | null) =>
    ['academic-reports', '0030', classroomId, periodNumber] as const,
  report0011: (classroomId?: string | null) =>
    ['academic-reports', '0011', classroomId] as const,
  report0001: (state?: string | null, academicYearId?: string | null) =>
    ['academic-reports', '0001', state, academicYearId] as const,
  report0002: (classroomId?: string | null, academicYearId?: string | null) =>
    ['academic-reports', '0002', classroomId, academicYearId] as const,
  report0003: (classroomId?: string | null, academicYearId?: string | null) =>
    ['academic-reports', '0003', classroomId, academicYearId] as const,
  report0019: (month?: number | string | null, classroomId?: string | null, educationLevel?: string | null, academicYearId?: string | null) =>
    ['academic-reports', '0019', month, classroomId, educationLevel, academicYearId] as const,
  byCode: (code: string, ...params: unknown[]) =>
    ['academic-reports', code, ...params] as const,
} as const;
