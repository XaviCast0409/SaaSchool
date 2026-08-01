import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { DirectoryUser, UserRole } from '../types';

interface UsersResponse {
  status: string;
  data: DirectoryUser[];
}

export const useUsers = (role?: UserRole) => {
  return useQuery({
    queryKey: ['users', role],
    queryFn: async () => {
      const params = role ? `?role=${role}` : '';
      const response = await api.get<UsersResponse>(`/users${params}`);
      return response.data.data;
    },
  });
};
