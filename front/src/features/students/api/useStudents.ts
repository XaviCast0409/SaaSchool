import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { Student, StudentFilterParams, StudentsPaginatedResponse, SiagieCatalogs } from '../types';

export interface CreateStudentPayload {
  firstNames: string;
  lastNamePaternal: string;
  lastNameMaternal?: string | null;
  documentType: string;
  documentId: string;
  gender: 'MALE' | 'FEMALE';
  birthDate: string;
  birthCountry?: string;
  birthUbigeo?: string | null;
  birthDepartment?: string | null;
  birthProvince?: string | null;
  birthDistrict?: string | null;
  residenceUbigeo?: string | null;
  motherTongue?: string;
  hasDisability?: boolean;
  disabilityType?: string | null;
  address?: string | null;
  studentCode?: string | null;
}

export type UpdateStudentPayload = Partial<CreateStudentPayload>;

export interface RegisterFichaMatriculaPayload {
  student: CreateStudentPayload;
  enrollment: {
    academicYearId: string;
    classroomId: string;
    condition: 'INGRESANTE' | 'CONTINUO' | 'TRASLADO' | 'REENTRANTE';
    previousSchoolModularCode?: string | null;
    repeatingGrade?: boolean;
  };
  guardian: {
    mode: 'EXISTING' | 'NEW';
    existingUserId?: string | null;
    relationshipType: string;
    isLegalGuardian: boolean;
    isFinancialResponsible: boolean;
    livesWithStudent: boolean;
    newGuardian?: {
      firstName?: string;
      lastNamePaternal?: string;
      lastNameMaternal?: string | null;
      documentType?: string;
      documentId?: string | null;
      email?: string;
      cellphone?: string | null;
      educationLevel?: string | null;
    };
  };
}

/** Hook para obtener catálogos maestros SIAGIE */
export const useSiagieCatalogs = () => {
  return useQuery({
    queryKey: ['siagie-catalogs'],
    queryFn: async () => {
      const response = await api.get<{ status: string; data: SiagieCatalogs }>('/students/catalogs');
      return response.data.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hora de caché
  });
};

/** Hook para obtener estudiantes (con paginación y filtros opcionales) */
export const useStudents = (filters: StudentFilterParams = {}, enabledOverride?: boolean) => {
  const isEnabled = enabledOverride !== undefined ? enabledOverride : true;

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

/** Hook para obtener un estudiante con su historial de matrícula y apoderados */
export const useStudent = (id?: string) => {
  return useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      if (!id) throw new Error('ID requerido');
      const response = await api.get<{ status: string; data: Student }>(`/students/${id}`);
      return response.data.data;
    },
    enabled: Boolean(id),
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

/** Hook para registro atómico de Ficha de Matrícula SIAGIE */
export const useRegisterFichaMatricula = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RegisterFichaMatriculaPayload) => {
      const response = await api.post<{ status: string; data: Student }>('/students/ficha-matricula', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student', variables.id] });
    },
  });
};

export interface NominaMatriculaStudent {
  id: string;
  studentCode?: string | null;
  documentType: string;
  documentId: string;
  firstNames: string;
  lastNamePaternal: string;
  lastNameMaternal?: string | null;
  gender: 'MALE' | 'FEMALE';
  birthDate: string;
  birthCountry: string;
  birthUbigeo?: string | null;
  birthDepartment?: string | null;
  birthProvince?: string | null;
  birthDistrict?: string | null;
  residenceUbigeo?: string | null;
  motherTongue: string;
  hasDisability: boolean;
  disabilityType?: string | null;
  address?: string | null;
  condition: string;
  repeatingGrade: boolean;
  enrollmentDate: string;
  guardian?: {
    relationshipType: string;
    isLegalGuardian: boolean;
    documentType?: string;
    documentId?: string;
    fullName: string;
    cellphone?: string;
    email?: string;
  } | null;
}

export interface NominaMatriculaResponse {
  school: {
    id: string;
    name: string;
    modularCode?: string | null;
    localCode?: string | null;
    department?: string | null;
    province?: string | null;
    district?: string | null;
    address?: string | null;
  };
  classroom: {
    id: string;
    grade: number;
    section: string;
    educationLevel: 'INITIAL' | 'PRIMARY' | 'SECONDARY';
    shift: string;
    tutorTeacher?: {
      id: string;
      firstName: string;
      lastNamePaternal: string;
      lastNameMaternal: string;
    } | null;
  };
  academicYear?: {
    id: string;
    year: number;
    name?: string;
  } | null;
  totalStudents: number;
  students: NominaMatriculaStudent[];
}

export const useNominaMatricula = (classroomId?: string, enabled = true) => {
  return useQuery({
    queryKey: ['nomina-matricula', classroomId],
    queryFn: async () => {
      if (!classroomId) throw new Error('ID de aula requerido');
      const response = await api.get<{ status: string; data: NominaMatriculaResponse }>(
        `/students/nomina-matricula/${classroomId}`
      );
      return response.data.data;
    },
    enabled: Boolean(classroomId) && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutos de caché
  });
};

/** Hook para obtener los hijos del apoderado autenticado (Multi-Hijo) */
export const useGetMyChildren = (enabled = true) => {
  return useQuery({
    queryKey: ['my-children'],
    queryFn: async () => {
      const { data } = await api.get<{ status: string; data: import('@/features/parent/types').ParentChildInfo[] }>(
        '/students/my-children'
      );
      return data.data;
    },
    enabled,
    staleTime: 1000 * 60 * 2,
  });
};
