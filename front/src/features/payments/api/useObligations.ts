import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { paymentsKeys, invalidatePaymentViews } from './keys';
import type {
  PaymentObligation,
  FinancialSummary,
  ObligationFilterParams,
  ObligationsPaginatedResponse,
  CreateIndividualObligationPayload,
} from '../types';
import type { CreateObligationFormData } from '../schemas/payment.schema';

interface ObligationsResponse { status: string; data: PaymentObligation[]; }
interface SingleObligationResponse { status: string; data: PaymentObligation; }
interface SummaryResponse { status: string; data: FinancialSummary; }

export interface BulkObligationsPayload {
  title: string;
  concept: string;
  dueDate: string;
  amountDue?: number | null;
  amountsByLevel?: { INITIAL: number | null; PRIMARY: number | null; SECONDARY: number | null } | null;
  educationLevel?: string;
  classroomId?: string;
}

export interface UpdateObligationDto {
  amountDue?: number;
  dueDate?: string;
  title?: string;
  concept?: string;
  notes?: string | null;
  /** Obligatorio cuando cambia el monto o el concepto. */
  reason?: string | null;
}

/** Hook para obtener las obligaciones de pago con paginación */
export const usePayments = (filters: ObligationFilterParams = {}, enabledOverride?: boolean) => {
  const queryParams = new URLSearchParams();
  if (filters.page) queryParams.append('page', String(filters.page));
  if (filters.limit) queryParams.append('limit', String(filters.limit));
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.classroomId) queryParams.append('classroomId', filters.classroomId);
  if (filters.enrollmentId) queryParams.append('enrollmentId', filters.enrollmentId);
  if (filters.search) queryParams.append('search', filters.search);
  if (filters.overdue) queryParams.append('overdue', 'true');

  const queryString = queryParams.toString();
  const url = `/payments/obligations${queryString ? `?${queryString}` : ''}`;
  const isEnabled = enabledOverride !== undefined ? enabledOverride : true;

  return useQuery({
    queryKey: paymentsKeys.obligations.list(filters),
    queryFn: async () => (await api.get<ObligationsPaginatedResponse>(url)).data,
    enabled: isEnabled,
  });
};

/** Hook para obtener las deudas del apoderado (Portal de Padres) */
export const useParentPayments = (enabled: boolean = true) =>
  useQuery({
    queryKey: paymentsKeys.parentObligations.all,
    queryFn: async () => (await api.get<ObligationsResponse>('/payments/obligations/my-children')).data.data,
    enabled,
  });

/** Hook para obtener el resumen financiero en tiempo real */
export const useFinancialSummary = (enabled: boolean = true) =>
  useQuery({
    queryKey: paymentsKeys.summary.all,
    queryFn: async () => (await api.get<SummaryResponse>('/payments/summary')).data.data,
    enabled,
  });

/** Detalle de una cuota con todos sus cobros (vigentes y anulados) */
export const useObligationDetail = (obligationId: string | null) =>
  useQuery({
    queryKey: paymentsKeys.obligationDetail.detail(obligationId),
    queryFn: async () => (await api.get<SingleObligationResponse>(`/payments/obligations/${obligationId}`)).data.data,
    enabled: !!obligationId,
  });

/** Mutation para crear una obligación individual */
export const useCreateObligation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateObligationFormData) =>
      (await api.post<SingleObligationResponse>('/payments/obligations', data)).data.data,
    onSuccess: () => invalidatePaymentViews(queryClient),
  });
};

/** Mutation para creación de cuota individual por alumno */
export const useCreateIndividualObligation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateIndividualObligationPayload) =>
      (await api.post<SingleObligationResponse>('/payments/obligations', payload)).data.data,
    onSuccess: () => invalidatePaymentViews(queryClient, { parent: true, transactions: true, cashClose: true }),
  });
};

/** Mutation para generación masiva de cronogramas */
export const useBulkCreateObligations = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: BulkObligationsPayload) =>
      (await api.post<{ status: string; data: { count: number; skippedCount: number; totalMatriculados: number } }>('/payments/obligations/bulk', data)).data.data,
    onSuccess: () => invalidatePaymentViews(queryClient),
  });
};

/** Mutation para editar una cuota o aplicar descuento */
export const useUpdateObligation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateObligationDto }) =>
      (await api.patch<SingleObligationResponse>(`/payments/obligations/${id}`, data)).data.data,
    onSuccess: () => invalidatePaymentViews(queryClient, { parent: true, transactions: true, cashClose: true }),
  });
};

/** Mutation para anular una cuota (con motivo; no se borra) */
export const useCancelObligation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ obligationId, reason }: { obligationId: string; reason: string }) =>
      (await api.post<SingleObligationResponse>(`/payments/obligations/${obligationId}/cancel`, { reason })).data.data,
    onSuccess: () => invalidatePaymentViews(queryClient, { obligationDetail: true }),
  });
};

/** Mutation para enviar recordatorio por Email individual */
export const useSendReminder = () =>
  useMutation({
    mutationFn: async ({ obligationId, channel = 'EMAIL' }: { obligationId: string; channel?: 'EMAIL' }) =>
      (await api.post(`/payments/obligations/${obligationId}/remind`, { channel })).data.data,
  });

/** Mutation para enviar recordatorios masivos por Email a morosos */
export const useSendBulkReminders = () =>
  useMutation({
    mutationFn: async (channel: 'EMAIL' = 'EMAIL') =>
      (await api.post('/payments/obligations/remind-overdue', { channel })).data.data,
  });
