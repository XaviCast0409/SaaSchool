export const schoolKeys = {
  all: ['school'] as const,
  detail: (schoolId?: string | null) => ['school', schoolId] as const,
} as const;

