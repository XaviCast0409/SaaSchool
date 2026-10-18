import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type {
  SupervisionStats,
  TeacherComplianceItem,
  SupervisedFeedResponse,
  SupervisionFeedFilters,
} from '../types';

/**
 * Obtener estadísticas globales de adopción y uso del aula virtual
 */
export const useSupervisionStats = (bimester?: number | null) => {
  return useQuery({
    queryKey: ['supervision-stats', bimester],
    queryFn: async (): Promise<SupervisionStats> => {
      const params = new URLSearchParams();
      if (bimester) params.append('bimester', String(bimester));

      const res = await api.get<{ status: string; data: SupervisionStats }>(
        `/course-contents/supervision/stats?${params.toString()}`,
      );
      return res.data.data;
    },
  });
};

/**
 * Obtener matriz de cumplimiento por docente
 */
export const useTeacherCompliance = (bimester?: number | null) => {
  return useQuery({
    queryKey: ['teacher-compliance', bimester],
    queryFn: async (): Promise<TeacherComplianceItem[]> => {
      const params = new URLSearchParams();
      if (bimester) params.append('bimester', String(bimester));

      const res = await api.get<{ status: string; data: TeacherComplianceItem[] }>(
        `/course-contents/supervision/teacher-compliance?${params.toString()}`,
      );
      return res.data.data;
    },
  });
};

/**
 * Obtener feed paginado de materiales supervisados con filtros
 */
export const useSupervisedFeed = (filters: SupervisionFeedFilters) => {
  return useQuery({
    queryKey: ['supervised-feed', filters],
    queryFn: async (): Promise<SupervisedFeedResponse> => {
      const params = new URLSearchParams();
      if (filters.bimester) params.append('bimester', String(filters.bimester));
      if (filters.classroomId) params.append('classroomId', filters.classroomId);
      if (filters.teacherId) params.append('teacherId', filters.teacherId);
      if (filters.educationLevel) params.append('educationLevel', filters.educationLevel);
      if (filters.contentType) params.append('contentType', filters.contentType);
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));

      const res = await api.get<{ status: string; data: SupervisedFeedResponse }>(
        `/course-contents/supervision/feed?${params.toString()}`,
      );
      return res.data.data;
    },
  });
};

/**
 * Eliminar / moderar publicación desde el panel de supervisión
 */
export const useDeleteSupervisedContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentId: string) => {
      const res = await api.delete(`/course-contents/${contentId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervision-stats'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-compliance'] });
      queryClient.invalidateQueries({ queryKey: ['supervised-feed'] });
      queryClient.invalidateQueries({ queryKey: ['course-contents'] });
    },
  });
};
