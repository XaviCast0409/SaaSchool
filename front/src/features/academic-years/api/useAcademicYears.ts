import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface AcademicYear {
  id: string;
  schoolId: string;
  year: number;
  name?: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface CreateAcademicYearPayload {
  year: number;
  name?: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

interface ApiResponse<T> {
  status: string;
  data: T;
}

export const useAcademicYears = () => {
  return useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<AcademicYear[]>>('/academic-years');
      return response.data.data;
    },
  });
};

export const useCreateAcademicYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateAcademicYearPayload) => {
      const response = await api.post<ApiResponse<AcademicYear>>('/academic-years', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
    },
  });
};

export const useUpdateAcademicYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<CreateAcademicYearPayload> }) => {
      const response = await api.patch<ApiResponse<AcademicYear>>(`/academic-years/${id}`, payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
    },
  });
};

export const useDeleteAcademicYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/academic-years/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
    },
  });
};
