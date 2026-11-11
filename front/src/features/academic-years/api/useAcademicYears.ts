import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface PeriodDateConfig {
  periodNumber: number;
  name: string;
  startDate: string;
  endDate: string;
}

export interface AcademicYear {
  id: string;
  schoolId: string;
  year: number;
  name?: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  periodType?: 'BIMESTER' | 'TRIMESTER';
  periodsConfig?: PeriodDateConfig[] | null;
  annualCalculationMode?: 'LAST_PERIOD' | 'AVERAGE';
}

export interface CreateAcademicYearPayload {
  year: number;
  name?: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  periodType?: 'BIMESTER' | 'TRIMESTER';
  periodsConfig?: PeriodDateConfig[] | null;
  annualCalculationMode?: 'LAST_PERIOD' | 'AVERAGE';
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

export const useActiveAcademicYear = () => {
  const query = useAcademicYears();
  const activeYear = (query.data || []).find((y) => y.isActive);
  return { ...query, activeYear };
};

export const useCreateAcademicYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateAcademicYearPayload) => {
      const response = await api.post<ApiResponse<AcademicYear>>('/academic-years', payload);
      return response.data.data;
    },
    // Crear el primer año lo activa: todo lo demás depende del año activo
    onSuccess: () => {
      queryClient.invalidateQueries();
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
    // Cambiar de año activo afecta a todas las pantallas: se descarta toda la caché
    onSuccess: (_data, variables) => {
      if (variables.payload.isActive !== undefined) queryClient.invalidateQueries();
      else queryClient.invalidateQueries({ queryKey: ['academic-years'] });
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
