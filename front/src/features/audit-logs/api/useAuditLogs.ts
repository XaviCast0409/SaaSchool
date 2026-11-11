import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface AuditLogItem {
  id: string;
  createdAt: string;
  action: string;
  actionLabel: string;
  category: string | null;
  categoryLabel: string;
  isCorrection: boolean;
  actorName: string;
  actorRole: string;
  actorRoleLabel: string;
  /** Frase en español: "Mariana Benavides (Dirección) corrigió notas — Matemática · 3.° Primaria "A"" */
  summary: string;
  details: Array<{ label: string; value: string }>;
}

export interface AuditLogsResponse {
  status: string;
  data: AuditLogItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface AuditLogFilters {
  category?: string;
  actorId?: string;
  onlyCorrections?: boolean;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export const useAuditLogs = (filters: AuditLogFilters = {}) => {
  const { category, actorId, onlyCorrections, from, to, page = 1, limit = 25 } = filters;
  return useQuery({
    queryKey: ['audit-logs', { category, actorId, onlyCorrections, from, to, page, limit }],
    queryFn: async (): Promise<AuditLogsResponse> => {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (actorId) params.append('actorId', actorId);
      if (onlyCorrections) params.append('onlyCorrections', 'true');
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      params.append('page', String(page));
      params.append('limit', String(limit));
      const response = await api.get<AuditLogsResponse>(`/audit-logs?${params.toString()}`);
      return response.data;
    },
  });
};

export const useAuditCategories = () =>
  useQuery({
    queryKey: ['audit-logs', 'categories'],
    queryFn: async () => (await api.get<{ data: Array<{ value: string; label: string }> }>('/audit-logs/categories')).data.data,
    staleTime: Infinity,
  });

export const useAuditActors = () =>
  useQuery({
    queryKey: ['audit-logs', 'actors'],
    queryFn: async () => (await api.get<{ data: Array<{ id: string; name: string; role: string }> }>('/audit-logs/actors')).data.data,
  });
