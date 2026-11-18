import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { studentsKeys } from './keys';
import { enrollmentsKeys } from '@/features/enrollments/api/keys';
import { paymentsKeys } from '@/features/payments/api/keys';
import type { Student } from '../types';

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
    customPensionAmount?: number | null;
    discountReason?: string | null;
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
      email?: string | null;
      cellphone?: string | null;
      educationLevel?: string | null;
    };
  };
}
export interface BulkCredentialsPayload {
  classroomId: string;
  target: 'STUDENTS' | 'GUARDIANS';
  onlyPending?: boolean;
}

interface FichaMatriculaResult {
  status: string;
  data: Student & {
    temporaryCredentials?: {
      student: { login: string; password: string };
      guardian: { login: string; password: string } | null;
    };
  };
}

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateStudentPayload) => {
      const response = await api.post<{ status: string; data: Student }>('/students', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentsKeys.all });
    },
  });
};

/** Hook para registro atómico de Ficha de Matrícula SIAGIE */
export const useRegisterFichaMatricula = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RegisterFichaMatriculaPayload) => {
      const response = await api.post<FichaMatriculaResult>('/students/ficha-matricula', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentsKeys.all });
      queryClient.invalidateQueries({ queryKey: enrollmentsKeys.all });
      queryClient.invalidateQueries({ queryKey: paymentsKeys.obligations.all });
      queryClient.invalidateQueries({ queryKey: paymentsKeys.summary.all });
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
      queryClient.invalidateQueries({ queryKey: studentsKeys.all });
      queryClient.invalidateQueries({ queryKey: studentsKeys.detail(variables.id) });
    },
  });
};

export const useResetStudentPassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, newPassword }: { studentId: string; newPassword?: string }) => {
      const response = await api.post<{ status: string; data: { message: string; temporaryPassword: string } }>(
        `/students/${studentId}/reset-password`,
        { newPassword },
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentsKeys.all });
    },
  });
};

export const useBulkCredentials = () =>
  useMutation({
    mutationFn: async (payload: BulkCredentialsPayload) => {
      const response = await api.post<{
        status: string;
        data: Array<{ id: string; fullName: string; login: string; temporaryPassword: string }>;
      }>('/students/credentials/bulk', payload);
      return response.data.data;
    },
  });
