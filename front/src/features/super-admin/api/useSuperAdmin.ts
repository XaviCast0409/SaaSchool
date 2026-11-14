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

export interface PlanCatalog {
  plans: Record<SubscriptionPlan, { label: string; monthlyPrice: number; studentQuota: number | null }>;
  graceDays: number;
  readOnlyUntilDay: number;
}

/** Catálogo de planes (precio de lista y cupo de alumnos) definido en el back */
export const usePlanCatalog = () => {
  return useQuery({
    queryKey: ['superadmin-plan-catalog'],
    queryFn: async () => {
      const response = await api.get<{ status: string; data: PlanCatalog }>('/schools/plans');
      return response.data.data;
    },
    staleTime: Infinity,
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
    mutationFn: async ({
      id,
      plan,
      planExpiresAt,
      monthlyFee,
    }: {
      id: string;
      plan?: SubscriptionPlan;
      planExpiresAt?: string | null;
      monthlyFee?: number | null;
    }) => {
      const response = await api.patch<{ status: string; data: SchoolWithStats }>(`/schools/${id}`, {
        plan,
        planExpiresAt,
        monthlyFee,
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-schools'] });
      queryClient.invalidateQueries({ queryKey: ['school'] });
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
