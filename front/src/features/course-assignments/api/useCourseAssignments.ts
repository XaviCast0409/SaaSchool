import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface CourseAssignment {
  id: string;
  schoolId: string;
  classroomId: string;
  areaId: string;
  teacherId: string;
  classroom: {
    id: string;
    educationLevel: 'INITIAL' | 'PRIMARY' | 'SECONDARY';
    grade: number;
    section: string;
    shift: string;
  };
  area: {
    id: string;
    name: string;
    officialCode?: string;
    competences?: Array<{ id: string; name: string }>;
  };
  teacher: {
    id: string;
    firstName: string;
    lastNamePaternal: string;
    lastNameMaternal: string;
    email: string;
  };
}

interface ApiResponse<T> {
  status: string;
  data: T;
}

/** Lista todas las asignaciones del colegio (Admin). */
export const useCourseAssignments = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['course-assignments'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<CourseAssignment[]>>('/course-assignments');
      return response.data.data;
    },
    enabled: options?.enabled ?? true,
  });
};

/** Lista solo los cursos asignados al docente autenticado. */
export const useMyCourseAssignments = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['course-assignments', 'my-courses'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<CourseAssignment[]>>('/course-assignments/my-courses');
      return response.data.data;
    },
    enabled: options?.enabled ?? true,
  });
};

/** Asigna un curso a un docente en un aula (Polidocencia). */
export const useCreateCourseAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { classroomId: string; areaId: string; teacherId: string }) => {
      const response = await api.post<ApiResponse<CourseAssignment>>('/course-assignments', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-assignments'] });
    },
  });
};

/** Asigna TODAS las áreas de un aula a un docente (Unidocencia — un clic). */
export const useBulkAssignUnidocente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { classroomId: string; teacherId: string; areaIds: string[] }) => {
      const response = await api.post<{ status: string; message: string; data: { count: number } }>(
        '/course-assignments/bulk',
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-assignments'] });
    },
  });
};

/** Sincroniza la carga horaria completa de un profesor (Checklist batch). */
export const useSyncTeacherAssignments = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      teacherId: string;
      assignments: { classroomId: string; areaId: string }[];
    }) => {
      const response = await api.post<{ status: string; message: string; data: { count: number } }>(
        '/course-assignments/sync-teacher',
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-assignments'] });
    },
  });
};
