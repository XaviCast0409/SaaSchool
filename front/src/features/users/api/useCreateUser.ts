import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { DirectoryUser } from '../types';
import type { CreateUserFormData } from '../schemas/user.schema';

interface CreateUserResponse {
  status: string;
  data: DirectoryUser;
}

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      const response = await api.post<CreateUserResponse>('/users', data);
      return response.data.data;
    },
    onSuccess: () => {
      // Invalida todas las queries de users para refrescar todas las listas
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
