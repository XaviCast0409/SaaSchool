export const secretariatKeys = {
  all: ['secretariat'] as const,
  settings: () => ['secretariat', 'settings'] as const,
  admissions: (filters?: Record<string, unknown> | null) => ['secretariat', 'admissions', filters] as const,
  ratifications: () => ['secretariat', 'ratifications'] as const,
  documents: (status?: string | null) => ['secretariat', 'documents', status] as const,
  complaints: () => ['secretariat', 'complaints'] as const,
  family: () => ['secretariat', 'family'] as const,
  publicSchool: (schoolId?: string | null) => ['public-school', schoolId] as const,
} as const;

