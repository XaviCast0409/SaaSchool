export interface UserFamilyFilters {
  search?: string;
  page?: number;
  limit?: number;
  unlinked?: boolean;
}

export const usersKeys = {
  all: ['users'] as const,
  list: (queryParams?: Record<string, unknown>) => ['users', queryParams] as const,
  familiesAll: ['users', 'families'] as const,
  families: (filters?: UserFamilyFilters) => ['users', 'families', filters] as const,
  renew: (id?: string) => ['users', 'renew', id] as const,
  staffLoad: ['staff-load'] as const,
  teacherReplacementsAll: ['teacher-replacements'] as const,
  teacherReplacementsPreview: (teacherId?: string | null) => ['teacher-replacements', 'preview', teacherId] as const,
  teacherReplacementsList: () => ['teacher-replacements', 'list'] as const,
} as const;

