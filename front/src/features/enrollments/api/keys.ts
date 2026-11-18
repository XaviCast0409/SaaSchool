export interface RolloverCandidatesParams {
  fromAcademicYearId?: string;
  toAcademicYearId?: string;
  classroomId?: string;
}

export const enrollmentsKeys = {
  all: ['enrollments'] as const,
  rolloverCandidatesAll: ['rollover-candidates'] as const,
  rolloverCandidates: (params?: RolloverCandidatesParams) => ['rollover-candidates', params] as const,
} as const;

