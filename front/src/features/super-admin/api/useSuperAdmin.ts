import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import {
  SchoolWithStats,
  CreateSchoolPayload,
  SubscriptionPayment,
  CreateSubscriptionPaymentPayload,
  BillingSummary,
} from '../types';
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

/** Cobrado este mes y el anterior (pagos de suscripción no anulados) */
export const useBillingSummary = () => {
  return useQuery({
    queryKey: ['superadmin-billing-summary'],
    queryFn: async () => {
      const response = await api.get<{ status: string; data: BillingSummary }>('/schools/billing-summary');
      return response.data.data;
    },
  });
};

/** Historial de pagos de suscripción de un colegio */
export const useSubscriptionPayments = (schoolId: string | null) => {
  return useQuery({
    queryKey: ['superadmin-subscription-payments', schoolId],
    queryFn: async () => {
      const response = await api.get<{ status: string; data: SubscriptionPayment[] }>(
        `/schools/${schoolId}/subscription-payments`,
      );
      return response.data.data;
    },
    enabled: !!schoolId,
  });
};

/** Vista previa de la nueva vigencia al pagar N meses (la regla vive en el back) */
export const useRenewalPreview = (schoolId: string | null, months: number) => {
  return useQuery({
    queryKey: ['superadmin-renewal-preview', schoolId, months],
    queryFn: async () => {
      const response = await api.get<{
        status: string;
        data: { newExpiresAt: string; currentExpiresAt: string | null };
      }>(`/schools/${schoolId}/subscription-payments/preview`, { params: { months } });
      return response.data.data;
    },
    enabled: !!schoolId && months >= 1 && months <= 24,
  });
};

const invalidateBilling = (queryClient: ReturnType<typeof useQueryClient>, schoolId: string) => {
  queryClient.invalidateQueries({ queryKey: ['superadmin-subscription-payments', schoolId] });
  queryClient.invalidateQueries({ queryKey: ['superadmin-renewal-preview', schoolId] });
  queryClient.invalidateQueries({ queryKey: ['superadmin-billing-summary'] });
  queryClient.invalidateQueries({ queryKey: ['superadmin-schools'] });
  queryClient.invalidateQueries({ queryKey: ['school'] });
};

/** Registrar un pago de suscripción (extiende la vigencia del plan) */
export const useCreateSubscriptionPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ schoolId, payload }: { schoolId: string; payload: CreateSubscriptionPaymentPayload }) => {
      const response = await api.post<{ status: string; data: SubscriptionPayment }>(
        `/schools/${schoolId}/subscription-payments`,
        payload,
      );
      return response.data.data;
    },
    onSuccess: (_data, { schoolId }) => invalidateBilling(queryClient, schoolId),
  });
};

/** Anular el último pago (revierte la vigencia si nadie la cambió después) */
export const useVoidSubscriptionPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ schoolId, paymentId, reason }: { schoolId: string; paymentId: string; reason: string }) => {
      const response = await api.post<{
        status: string;
        data: { payment: SubscriptionPayment; expiryReverted: boolean };
      }>(`/schools/${schoolId}/subscription-payments/${paymentId}/void`, { reason });
      return response.data.data;
    },
    onSuccess: (_data, { schoolId }) => invalidateBilling(queryClient, schoolId),
  });
};
