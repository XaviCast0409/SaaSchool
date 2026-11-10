import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { toast } from 'sonner';

export interface GradingScaleThresholds {
  AD: number;
  A: number;
  B: number;
}

export const useGradingScale = (level: 'PRIMARY' | 'SECONDARY') => {
  return useQuery({
    queryKey: ['grading-scale', level],
    queryFn: async (): Promise<GradingScaleThresholds> => {
      const response = await api.get<{ status: string; data: GradingScaleThresholds }>(
        `/grades/grading-scale?level=${level}`,
      );
      return response.data.data;
    },
    enabled: Boolean(level),
  });
};

export const useUpdateGradingScale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { level: 'PRIMARY' | 'SECONDARY'; AD: number; A: number; B: number }) => {
      const response = await api.put<{ status: string; data: GradingScaleThresholds }>(
        '/grades/grading-scale',
        payload,
      );
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['grading-scale', variables.level] });
      toast.success('Escala de calificación actualizada con éxito.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al actualizar la escala.');
    },
  });
};
