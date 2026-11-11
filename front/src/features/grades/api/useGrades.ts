import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import type { EvaluationCriterion } from '../types';

interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

/**
 * Lista los criterios o rubros evaluativos del colegio.
 */
export const useEvaluationCriteria = (level?: string) => {
  return useQuery({
    queryKey: ['evaluation-criteria', level],
    queryFn: async () => {
      const response = await api.get<ApiResponse<EvaluationCriterion[]>>('/grades/criteria', {
        params: level ? { level } : undefined,
      });
      return response.data.data;
    },
  });
};

/**
 * Crea un nuevo criterio evaluativo (Admin).
 */
export const useCreateCriterion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<EvaluationCriterion>) => {
      const response = await api.post<ApiResponse<EvaluationCriterion>>('/grades/criteria', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-criteria'] });
      toast.success('Criterio creado', {
        description: 'El nuevo rubro evaluativo ha sido registrado correctamente.',
      });
    },
    onError: (error: any) => {
      toast.error('Error al crear criterio', {
        description: error?.response?.data?.message || 'No se pudo registrar el criterio.',
      });
    },
  });
};

/**
 * Actualiza un criterio evaluativo (Admin).
 */
export const useUpdateCriterion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EvaluationCriterion> }) => {
      const response = await api.put<ApiResponse<EvaluationCriterion>>(`/grades/criteria/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-criteria'] });
      toast.success('Criterio actualizado', {
        description: 'Las modificaciones han sido guardadas.',
      });
    },
    onError: (error: any) => {
      toast.error('Error al actualizar criterio', {
        description: error?.response?.data?.message || 'No se pudo actualizar el criterio.',
      });
    },
  });
};

/**
 * Desactiva un criterio evaluativo (Admin).
 */
export const useDeleteCriterion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<ApiResponse<null>>(`/grades/criteria/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-criteria'] });
      toast.success('Criterio desactivado', {
        description: 'El criterio ya no aparecerá en nuevas evaluaciones.',
      });
    },
    onError: (error: any) => {
      toast.error('Error al desactivar criterio', {
        description: error?.response?.data?.message || 'No se pudo desactivar el criterio.',
      });
    },
  });
};
