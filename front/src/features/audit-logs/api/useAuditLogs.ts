import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface AuditLogItem {
  id: string;
  schoolId: string;
  actorId: string;
  actorRole: string;
  actorEmail?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface AuditLogsResponse {
  status: string;
  data: AuditLogItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuditLogFilters {
  entity?: string;
  actorId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export const useAuditLogs = (filters: AuditLogFilters = {}) => {
  const { entity, actorId, from, to, page = 1, limit = 25 } = filters;

  return useQuery({
    queryKey: ['audit-logs', { entity, actorId, from, to, page, limit }],
    queryFn: async (): Promise<AuditLogsResponse> => {
      const params = new URLSearchParams();
      if (entity && entity !== 'ALL') params.append('entity', entity);
      if (actorId) params.append('actorId', actorId);
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      params.append('page', String(page));
      params.append('limit', String(limit));

      const response = await api.get<AuditLogsResponse>(`/audit-logs?${params.toString()}`);
      return response.data;
    },
  });
};
