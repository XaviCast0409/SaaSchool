import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface CurricularCompetence {
  id: string;
  areaId: string;
  name: string;
  description?: string;
}

export interface CurricularArea {
  id: string;
  schoolId: string;
  name: string;
  officialCode?: string;
  isActive: boolean;
  competences?: CurricularCompetence[];
}

export interface CreateCurricularAreaPayload {
  name: string;
  officialCode?: string;
  isActive?: boolean;
}

export interface CreateCompetencePayload {
  areaId: string;
  name: string;
  description?: string;
}

export interface CurricularAreaPaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CurricularAreaResponse {
  status: string;
  data: CurricularArea[];
}

export interface CurricularAreaPaginatedResponse {
  status: string;
  data: CurricularArea[];
  meta: CurricularAreaPaginatedMeta;
}

interface SingleAreaResponse {
  status: string;
  data: CurricularArea;
}

/** Hook para obtener asignaturas paginadas con soporte de filtros por nivel */
export const useCurricularAreasPaginated = (page: number = 1, limit: number = 8, level: string = 'ALL') => {
  return useQuery({
    queryKey: ['curricular-areas', 'paginated', page, limit, level],
    queryFn: async () => {
      const response = await api.get<CurricularAreaPaginatedResponse>(
        `/curricular-areas?page=${page}&limit=${limit}&level=${level}`,
      );
      return response.data;
    },
  });
};

/** Hook para obtener todas las asignaturas sin paginación (usado en dropdowns de asignación docente) */
export const useCurricularAreas = () => {
  return useQuery({
    queryKey: ['curricular-areas', 'all'],
    queryFn: async () => {
      const response = await api.get<CurricularAreaResponse>('/curricular-areas');
      return response.data.data;
    },
  });
};

export const useCreateCurricularArea = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateCurricularAreaPayload) => {
      const response = await api.post<SingleAreaResponse>('/curricular-areas', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricular-areas'] });
    },
  });
};

export const useUpdateCurricularArea = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<CreateCurricularAreaPayload> }) => {
      const response = await api.patch<SingleAreaResponse>(`/curricular-areas/${id}`, payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricular-areas'] });
    },
  });
};

export const useDeleteCurricularArea = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/curricular-areas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricular-areas'] });
    },
  });
};

export const useCreateCompetence = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateCompetencePayload) => {
      const response = await api.post<{ status: string; data: CurricularCompetence }>('/curricular-areas/competences', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricular-areas'] });
    },
  });
};

export const useSeedMineduCurriculum = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<{ status: string; message: string; data: { count: number } }>('/curricular-areas/seed-minedu');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curricular-areas'] });
    },
  });
};
