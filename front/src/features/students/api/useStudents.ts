import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Student } from '../types';

interface StudentsResponse {
  status: string;
  data: Student[];
}

export const useStudents = () => {
  return useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const response = await api.get<StudentsResponse>('/students');
      return response.data.data;
    },
  });
};
