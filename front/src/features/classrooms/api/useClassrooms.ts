import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Classroom } from '../types';

interface ClassroomsResponse {
  status: string;
  data: Classroom[];
}

export const useClassrooms = () => {
  return useQuery({
    queryKey: ['classrooms'],
    queryFn: async () => {
      const response = await api.get<ClassroomsResponse>('/classrooms');
      return response.data.data;
    },
  });
};
