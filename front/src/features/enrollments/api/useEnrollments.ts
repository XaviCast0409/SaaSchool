import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Enrollment } from '../types';

interface EnrollmentsResponse {
  status: string;
  data: Enrollment[];
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
