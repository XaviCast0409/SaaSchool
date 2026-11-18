import type { IncidentFilterParams } from '../types';

export const incidentsKeys = {
  all: ['incidents'] as const,
  list: (filters?: IncidentFilterParams) => ['incidents', filters] as const,
} as const;

