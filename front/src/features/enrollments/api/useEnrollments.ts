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
