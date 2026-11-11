import { useQuery } from '@tanstack/react-query';
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

import { useAuthStore } from '@/store/useAuthStore';

/** Lista todas las asignaciones del colegio (Admin). */
export const useCourseAssignments = (options?: { enabled?: boolean }) => {
  const { user, impersonatedSchool } = useAuthStore();
  const currentSchoolId =
    user?.role === 'SUPER_ADMIN' && impersonatedSchool?.id
      ? impersonatedSchool.id
      : user?.schoolId;

  return useQuery({
    queryKey: ['course-assignments', currentSchoolId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<CourseAssignment[]>>('/course-assignments');
      return response.data.data;
    },
    enabled: options?.enabled ?? true,
  });
};

/** Lista solo los cursos asignados al docente autenticado. */
export const useMyCourseAssignments = (options?: { enabled?: boolean }) => {
  const { user, impersonatedSchool } = useAuthStore();
  const currentSchoolId =
    user?.role === 'SUPER_ADMIN' && impersonatedSchool?.id
      ? impersonatedSchool.id
      : user?.schoolId;

  return useQuery({
    queryKey: ['course-assignments', 'my-courses', user?.id, currentSchoolId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<CourseAssignment[]>>('/course-assignments/my-courses');
      return response.data.data;
    },
    enabled: options?.enabled ?? true,
  });
};

