export const announcementsKeys = {
  all: ['announcements'] as const,
  list: (filters?: Record<string, unknown> | null) => ['announcements', filters] as const,
  responses: (id?: string | null) => ['announcements', 'responses', id] as const,
} as const;

