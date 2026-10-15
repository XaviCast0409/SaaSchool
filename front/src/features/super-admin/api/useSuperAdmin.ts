import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { SchoolWithStats, CreateSchoolPayload } from '../types';
import { SubscriptionPlan } from '@/features/schools/types';

interface SchoolsResponse {
  status: string;
  data: SchoolWithStats[];
}

/** Hook para obtener todos los colegios registrados en la plataforma (Exclusivo SUPER_ADMIN) */
export const useGetAllSchools = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['superadmin-schools'],
    queryFn: async () => {
      const response = await api.get<SchoolsResponse>('/schools');
      return response.data.data;
    },
    enabled,
  });
};

/** Hook para dar de alta un nuevo colegio cliente con su Administrador Inicial */
export const useCreateSchool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateSchoolPayload) => {
      const response = await api.post<{ status: string; data: SchoolWithStats }>('/schools', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-schools'] });
    },
  });
};

/** Hook para actualizar el plan o vigencia de un colegio */
export const useUpdateSchoolPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, plan, planExpiresAt }: { id: string; plan?: SubscriptionPlan; planExpiresAt?: string }) => {
      const response = await api.patch<{ status: string; data: SchoolWithStats }>(`/schools/${id}`, {
        plan,
        planExpiresAt,
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-schools'] });
      queryClient.invalidateQueries({ queryKey: ['active-school'] });
    },
  });
};

/** Hook para suspender/desactivar un colegio */
export const useDeactivateSchool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ status: string; data: SchoolWithStats }>(`/schools/${id}`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-schools'] });
    },
  });
};

/** Hook para reactivar un colegio suspendido */
export const useReactivateSchool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<{ status: string; data: SchoolWithStats }>(`/schools/${id}/reactivate`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-schools'] });
    },
  });
};

/** Hook para actualizar datos de contacto e institucionales de un colegio (SUPER_ADMIN) */
export const useUpdateSchoolInfo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SchoolWithStats> }) => {
      const response = await api.patch<{ status: string; data: SchoolWithStats }>(`/schools/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-schools'] });
      queryClient.invalidateQueries({ queryKey: ['school'] });
    },
  });
};

/** Hook para restablecer la contraseña del Administrador/Director de un colegio */
export const useResetAdminPassword = () => {
  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password?: string }) => {
      const response = await api.post<{
        status: string;
        data: { adminEmail: string; newPassword: string; adminName: string };
      }>(`/schools/${id}/reset-admin-password`, { password });
      return response.data.data;
    },
  });
};
