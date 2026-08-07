import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { DirectoryUser, UserRole } from '../types';

interface UsersResponse {
  status: string;
  data: DirectoryUser[];
}

export interface CreateUserPayload {
  email: string;
  password?: string;
  firstName: string;
  lastNamePaternal: string;
  lastNameMaternal: string;
  role: UserRole;
  documentType?: string;
  documentId?: string;
  cellphone?: string;
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

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      // Auto-generate password if not provided
      const defaultPassword = payload.password || `Parent${payload.documentId || '123456'}`;
      const response = await api.post<{ status: string; data: DirectoryUser }>('/users', {
        ...payload,
        password: defaultPassword,
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
