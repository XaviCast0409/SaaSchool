import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { studentsKeys } from './keys';
import type { Student, StudentFilterParams, StudentsPaginatedResponse, SiagieCatalogs } from '../types';
import type { ParentChildInfo } from '@/features/parent/types';

/** Hook para obtener catálogos maestros SIAGIE */
export const useSiagieCatalogs = () => {
  return useQuery({
    queryKey: studentsKeys.siagieCatalogs(),
    queryFn: async () => {
      const response = await api.get<{ status: string; data: SiagieCatalogs }>('/students/catalogs');
      return response.data.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hora de caché
  });
};

/** Hook para obtener estudiantes (con paginación y filtros opcionales) */
export const useStudents = (
  filters: StudentFilterParams = {},
  enabledOverride?: boolean,
  options: { keepPrevious?: boolean } = {},
) => {
  const isEnabled = enabledOverride !== undefined ? enabledOverride : true;

  return useQuery({
    queryKey: studentsKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.search) params.append('search', filters.search);
      if (filters.scope) params.append('scope', filters.scope);
      if (filters.classroomId) params.append('classroomId', filters.classroomId);
      if (filters.educationLevel) params.append('educationLevel', filters.educationLevel);
      if (filters.grade !== undefined) params.append('grade', String(filters.grade));
      if (filters.section) params.append('section', filters.section);

      const response = await api.get<StudentsPaginatedResponse>(`/students?${params.toString()}`);
      return response.data;
    },
    enabled: isEnabled,
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
  });
};

/** Hook para obtener un estudiante con su historial de matrícula y apoderados */
export const useStudent = (id?: string) => {
  return useQuery({
    queryKey: studentsKeys.detail(id),
    queryFn: async () => {
      if (!id) throw new Error('ID requerido');
      const response = await api.get<{ status: string; data: Student }>(`/students/${id}`);
      return response.data.data;
    },
    enabled: Boolean(id),
  });
};

/** Hook para obtener los hijos del apoderado autenticado (Multi-Hijo) */
export const useGetMyChildren = (enabled = true) => {
  return useQuery({
    queryKey: studentsKeys.myChildren(),
    queryFn: async () => {
      const { data } = await api.get<{ status: string; data: ParentChildInfo[] }>('/students/my-children');
      return data.data;
    },
    enabled,
    staleTime: 1000 * 60 * 2,
  });
};
