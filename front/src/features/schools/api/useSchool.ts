import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { School, UpdateSchoolPayload } from '../types';
import { useAuthStore } from '@/store/useAuthStore';

export const useGetActiveSchool = () => {
  const schoolId = useAuthStore((state) => state.user?.schoolId);

  return useQuery({
    queryKey: ['school', schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      try {
        const response = await api.get<{ status: string; data: School }>(`/schools/${schoolId}`);
        return response.data.data;
      } catch (err: any) {
        if (err?.response?.status === 404) {
          useAuthStore.getState().logout();
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        throw err;
      }
    },
    enabled: !!schoolId,
    retry: false,
  });
};

export const useUpdateSchool = () => {
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((state) => state.user?.schoolId);

  return useMutation({
    mutationFn: async (payload: UpdateSchoolPayload) => {
      if (!schoolId) throw new Error('No hay colegio activo');
      const response = await api.patch<{ status: string; data: School }>(
        `/schools/${schoolId}`,
        payload,
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school', schoolId] });
    },
  });
};
