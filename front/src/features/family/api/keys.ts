export const familyKeys = {
  all: ['family'] as const,
  overview: () => ['family', 'overview'] as const,
  timeline: (studentId: string | null, days = 14) => ['family', 'timeline', studentId, days] as const,
  gate: () => ['family', 'gate'] as const,
} as const;
