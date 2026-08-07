import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { Student, StudentFilterParams, StudentsPaginatedResponse } from '../types';

export interface CreateStudentPayload {
  firstNames: string;
  lastNamePaternal: string;
  lastNameMaternal: string;
  documentType: string;
  documentId: string;
  gender: 'MALE' | 'FEMALE';
  birthDate: string;
  birthCountry?: string;
  motherTongue?: string;
  hasDisability?: boolean;
  disabilityType?: string;
  address?: string;
  studentCode?: string;
}

export type UpdateStudentPayload = Partial<CreateStudentPayload>;

/** Hook para obtener estudiantes requeridos obligatoriamente por filtro de sección, búsqueda o nivel */
export const useStudents = (filters: StudentFilterParams = {}, enabledOverride?: boolean) => {
  const isEnabled =
    enabledOverride !== undefined
      ? enabledOverride
      : Boolean(
          filters.classroomId ||
            filters.search ||
            filters.educationLevel ||
            filters.grade !== undefined
        );

  return useQuery({
    queryKey: ['students', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.search) params.append('search', filters.search);
      if (filters.classroomId) params.append('classroomId', filters.classroomId);
      if (filters.educationLevel) params.append('educationLevel', filters.educationLevel);
      if (filters.grade !== undefined) params.append('grade', String(filters.grade));
      if (filters.section) params.append('section', filters.section);

      const response = await api.get<StudentsPaginatedResponse>(`/students?${params.toString()}`);
      return response.data;
    },
    enabled: isEnabled,
  });
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateStudentPayload) => {
      const response = await api.post<{ status: string; data: Student }>('/students', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateStudentPayload }) => {
      const response = await api.patch<{ status: string; data: Student }>(`/students/${id}`, payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
};
