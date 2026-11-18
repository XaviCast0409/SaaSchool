export const academicYearsKeys = {
  all: ['academic-years'] as const,
  activationImpact: (academicYearId?: string | null) => ['academic-years', 'activation-impact', academicYearId] as const,
} as const;

