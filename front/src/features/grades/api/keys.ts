export const gradesKeys = {
  evaluationCriteriaAll: ['evaluation-criteria'] as const,
  evaluationCriteria: (level?: string | null) => ['evaluation-criteria', level] as const,
  gradingScaleAll: ['grading-scale'] as const,
  gradingScale: (level?: string | null) => ['grading-scale', level] as const,
} as const;

