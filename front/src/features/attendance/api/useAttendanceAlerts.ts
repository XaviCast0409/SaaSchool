import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import type { AttendanceAlert } from '../types';

export interface AlertsFilters {
  status?: 'OPEN' | 'ATTENDED';
  page?: number;
  limit?: number;
}

export interface AlertsResponse {
  status: string;
  data: AttendanceAlert[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const useAttendanceAlerts = (filters: AlertsFilters = {}) => {
  return useQuery({
    queryKey: ['attendance-alerts', filters],
    queryFn: async (): Promise<AlertsResponse> => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));

      const res = await api.get<AlertsResponse>(`/attendance/alerts?${params.toString()}`);
      return res.data;
    },
  });
};

export const useAttendAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }): Promise<AttendanceAlert> => {
      const res = await api.patch<{ status: string; data: AttendanceAlert }>(
        `/attendance/alerts/${id}/attend`,
        { note },
      );
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-alerts'] });
      toast.success('Alerta marcada como atendida.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al atender la alerta.');
    },
  });
};

export const useCiteFamily = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      citationDate,
      note,
    }: {
      id: string;
      citationDate: string;
      note?: string;
    }): Promise<AttendanceAlert> => {
      const res = await api.post<{ status: string; data: AttendanceAlert }>(
        `/attendance/alerts/${id}/cite`,
        { citationDate, note },
      );
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-alerts'] });
      toast.success('Familia citada y alerta atendida.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al registrar la citación.');
    },
  });
};

export const useEvaluateAlerts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ created: number }> => {
      const res = await api.post<{ status: string; data: { created: number } }>(
        '/attendance/alerts/evaluate',
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-alerts'] });
      toast.success(
        data.created > 0
          ? `Evaluación completada: ${data.created} nueva(s) alerta(s) generada(s).`
          : 'Evaluación completada: no se detectaron nuevas alertas.',
      );
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al ejecutar la evaluación de alertas.');
    },
  });
};
