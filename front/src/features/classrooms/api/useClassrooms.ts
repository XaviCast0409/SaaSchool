import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Classroom } from '../types';

export interface CreateClassroomPayload {
  educationLevel: 'INITIAL' | 'PRIMARY' | 'SECONDARY';
  grade: number;
  section: string;
  shift?: 'MORNING' | 'AFTERNOON' | 'NIGHT';
  capacity?: number;
  tutorTeacherId?: string | null;
}

interface ClassroomsResponse {
  status: string;
  data: Classroom[];
}

interface SingleClassroomResponse {
  status: string;
  data: Classroom;
}

/** Aulas del año que se está viendo. Con `includeClosed`, también las secciones no abiertas ese año. */
export const useClassrooms = (enabled = true, includeClosed = false) => {
  return useQuery({
    queryKey: ['classrooms', { includeClosed }],
    enabled,
    queryFn: async () => {
      const response = await api.get<ClassroomsResponse>('/classrooms', {
        params: includeClosed ? { includeClosed: 'true' } : undefined,
      });
      return response.data.data;
    },
  });
};

/** Abre, cierra o ajusta (vacantes y tutor) una sección en un año. */
export const useSetClassroomYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      academicYearId,
      body,
    }: {
      id: string;
      academicYearId: string;
      body: { open: boolean; capacity?: number; tutorTeacherId?: string | null };
    }) => (await api.put(`/classrooms/${id}/years/${academicYearId}`, body)).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      queryClient.invalidateQueries({ queryKey: ['rollover-candidates'] });
    },
  });
};

export const useCopyClassroomYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { fromAcademicYearId: string; toAcademicYearId: string; includeTutors: boolean }) =>
      (await api.post<{ data: { copied: number; skipped: number } }>('/classrooms/copy-year', body)).data.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classrooms'] }),
  });
};

export const useCreateClassroom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateClassroomPayload) => {
      const response = await api.post<SingleClassroomResponse>('/classrooms', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
  });
};

export const useUpdateClassroom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<CreateClassroomPayload> }) => {
      const response = await api.patch<SingleClassroomResponse>(`/classrooms/${id}`, payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
  });
};

export const useDeleteClassroom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/classrooms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
  });
};

export interface BulkCreateClassroomsPayload {
  educationLevel: 'INITIAL' | 'PRIMARY' | 'SECONDARY';
  grades: number[];
  sections: string[];
  shift: 'MORNING' | 'AFTERNOON' | 'NIGHT';
  capacity: number;
}

export const useBulkCreateClassrooms = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BulkCreateClassroomsPayload) => {
      const response = await api.post<{ status: string; data: { created: string[]; skipped: string[] } }>(
        '/classrooms/bulk',
        payload,
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
  });
};

/** Secciones abiertas en un año concreto (p. ej. el año destino al matricular), sin depender del año que se está viendo. */
export const useClassroomsForYear = (academicYearId?: string) =>
  useQuery({
    queryKey: ['classrooms', 'year', academicYearId],
    enabled: !!academicYearId,
    queryFn: async () =>
      (await api.get<ClassroomsResponse>('/classrooms', { headers: { 'x-academic-year-id': academicYearId! } })).data
        .data,
  });
