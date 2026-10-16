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

export interface UserQueryParams {
  role?: UserRole;
  roles?: string;
  staffOnly?: boolean;
  limit?: number;
  page?: number;
  search?: string;
}

export const useUsers = (roleOrParams?: UserRole | UserQueryParams) => {
  const queryParams: UserQueryParams =
    typeof roleOrParams === 'string'
      ? { role: roleOrParams }
      : roleOrParams || {};

  return useQuery({
    queryKey: ['users', queryParams],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (queryParams.role) searchParams.append('role', queryParams.role);
      if (queryParams.roles) searchParams.append('roles', queryParams.roles);
      if (queryParams.staffOnly) searchParams.append('staffOnly', 'true');
      if (queryParams.limit) searchParams.append('limit', String(queryParams.limit));
      else searchParams.append('limit', '500');
      if (queryParams.page) searchParams.append('page', String(queryParams.page));
      if (queryParams.search) searchParams.append('search', queryParams.search);

      const queryString = searchParams.toString();
      const response = await api.get<UsersResponse>(`/users${queryString ? `?${queryString}` : ''}`);
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
