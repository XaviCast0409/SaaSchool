import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Enrollment } from '../types';

interface EnrollmentsResponse {
  status: string;
  data: Enrollment[];
}

export interface CreateEnrollmentPayload {
  studentId: string;
  academicYearId: string;
  classroomId: string;
  previousSchoolModularCode?: string;
  repeatingGrade?: boolean;
}

export const useEnrollments = () => {
  return useQuery({
    queryKey: ['enrollments'],
    queryFn: async () => {
      const response = await api.get<EnrollmentsResponse>('/enrollments');
      return response.data.data;
    },
  });
};

export const useCreateEnrollment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateEnrollmentPayload) => {
      const response = await api.post<{ status: string; data: Enrollment }>('/enrollments', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
};

export type EnrollmentState = 'REGISTERED' | 'WITHDRAWN' | 'TRANSFERRED';

export interface ChangeEnrollmentStatePayload {
  enrollmentId: string;
  enrollmentState: EnrollmentState;
  /** Último día que el alumno estudió (AAAA-MM-DD). Solo para retiro o traslado. */
  stateChangeDate?: string;
  withdrawalReason?: string | null;
  transferSchool?: string | null;
}

/**
 * Retira, traslada o reincorpora a un alumno. Con la fecha de retiro, sus notas de los periodos ya
 * completados y su asistencia hasta ese día se mantienen (y se suben al SIAGIE); lo posterior se bloquea.
 */
export const useChangeEnrollmentState = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ enrollmentId, ...body }: ChangeEnrollmentStatePayload) => {
      const response = await api.patch<{ status: string; data: Enrollment & { cancelledObligations?: number } }>(
        `/enrollments/${enrollmentId}`,
        body,
      );
      return response.data.data;
    },
    onSuccess: () => {
      // El cambio afecta listas, notas, asistencia y cobranza
      queryClient.invalidateQueries();
    },
  });
};
