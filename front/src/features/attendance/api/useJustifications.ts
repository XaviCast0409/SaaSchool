import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import type {
  AttendanceJustification,
  CreateJustificationPayload,
  ReviewJustificationPayload,
} from '../types';

export interface JustificationFilters {
  status?: string;
  enrollmentId?: string;
  page?: number;
  limit?: number;
}

export interface JustificationsResponse {
  status: string;
  data: AttendanceJustification[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const useJustifications = (filters: JustificationFilters = {}) => {
  return useQuery({
    queryKey: ['attendance-justifications', filters],
    queryFn: async (): Promise<JustificationsResponse> => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.enrollmentId) params.append('enrollmentId', filters.enrollmentId);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));

      const res = await api.get<JustificationsResponse>(`/attendance/justifications?${params.toString()}`);
      return res.data;
    },
  });
};

export const useCreateJustification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateJustificationPayload): Promise<AttendanceJustification> => {
      const res = await api.post<{ status: string; data: AttendanceJustification }>(
        '/attendance/justifications',
        payload,
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-justifications'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['student-attendance'] });

      if (data.status === 'APPROVED') {
        toast.success('Justificación registrada y aplicada.');
      } else {
        toast.success('Justificación enviada. El colegio la revisará pronto.');
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al enviar la justificación.');
    },
  });
};

export const useReviewJustification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: ReviewJustificationPayload;
    }): Promise<AttendanceJustification> => {
      const res = await api.patch<{ status: string; data: AttendanceJustification }>(
        `/attendance/justifications/${id}/review`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-justifications'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['student-attendance'] });
      toast.success(
        data.status === 'APPROVED'
          ? 'Justificación aprobada correctamente.'
          : 'Justificación rechazada.',
      );
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al revisar la justificación.');
    },
  });
};
