export const auditLogsKeys = {
  all: ['audit-logs'] as const,
  list: (filters?: Record<string, unknown>) => ['audit-logs', filters] as const,
  categories: () => ['audit-logs', 'categories'] as const,
  actors: () => ['audit-logs', 'actors'] as const,
} as const;

