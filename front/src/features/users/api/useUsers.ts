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
  /** Personal: años para los que queda contratado (por defecto, el vigente) */
  academicYearIds?: string[];
}

export interface UserQueryParams {
  role?: UserRole;
  roles?: string;
  staffOnly?: boolean;
  limit?: number;
  page?: number;
  search?: string;
  /** 'year': personal contratado en el año elegido en la cabecera; 'all': todo el personal */
  yearScope?: 'year' | 'all';
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
      if (queryParams.yearScope) searchParams.append('yearScope', queryParams.yearScope);

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
      const response = await api.post<{ status: string; data: DirectoryUser & { temporaryPassword?: string | null } }>(
        '/users',
        payload
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useResetUserPassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword?: string }) => {
      const response = await api.post<{ status: string; data: { message: string; temporaryPassword: string } }>(
        `/users/${userId}/reset-password`,
        { newPassword },
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

/** Contratar o quitar a una persona del personal de un año. */
export const useSetStaffYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, academicYearId, hired, position }: { userId: string; academicYearId: string; hired: boolean; position?: string | null }) =>
      (await api.put(`/users/${userId}/years/${academicYearId}`, { hired, position })).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['staff-load'] });
    },
  });
};

/** Renovar: contratar en el año destino al personal del año de origen. */
export const useCopyStaffYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { fromAcademicYearId: string; toAcademicYearId: string; userIds?: string[] }) =>
      (await api.post<{ data: { hired: number; skipped: number } }>('/users/staff-years/copy', body)).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['staff-load'] });
    },
  });
};
