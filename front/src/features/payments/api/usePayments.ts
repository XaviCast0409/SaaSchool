import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import {
  PaymentObligation,
  PaymentTransaction,
  FinancialSummary,
  ReceiptData,
  ObligationFilterParams,
  TransactionFilterParams,
  ObligationsPaginatedResponse,
  DailyCashCloseData,
  CreateIndividualObligationPayload,
  FinanceAccess,
} from '../types';
import type {
  CreateObligationFormData,
  BulkCreateObligationsFormData,
  RegisterTransactionFormData,
} from '../schemas/payment.schema';

interface ObligationsResponse {
  status: string;
  data: PaymentObligation[];
}

interface SingleObligationResponse {
  status: string;
  data: PaymentObligation;
}

interface TransactionsResponse {
  status: string;
  data: PaymentTransaction[];
}

interface SingleTransactionResponse {
  status: string;
  data: PaymentTransaction;
}

interface SummaryResponse {
  status: string;
  data: FinancialSummary;
}

interface ReceiptResponse {
  status: string;
  data: ReceiptData;
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
    queryKey: ['payments-obligations', filters.page, filters.limit, filters.status, filters.classroomId, filters.search, filters.overdue],
    queryFn: async () => {
      const response = await api.get<ObligationsPaginatedResponse>(url);
      return response.data;
    },
    enabled: isEnabled,
  });
};

/** Hook para obtener las deudas del apoderado (Portal de Padres) */
export const useParentPayments = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['parent-payments-obligations'],
    queryFn: async () => {
      const response = await api.get<ObligationsResponse>('/payments/obligations/my-children');
      return response.data.data;
    },
    enabled,
  });
};

/** Hook para obtener el resumen financiero en tiempo real */
export const useFinancialSummary = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['financial-summary'],
    queryFn: async () => {
      const response = await api.get<SummaryResponse>('/payments/summary');
      return response.data.data;
    },
    enabled,
  });
};

/** Hook para obtener el historial de cobros/transacciones */
export const useTransactions = (filters: TransactionFilterParams = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.startDate) queryParams.append('startDate', filters.startDate);
  if (filters.endDate) queryParams.append('endDate', filters.endDate);
  if (filters.paymentMethod) queryParams.append('paymentMethod', filters.paymentMethod);

  const queryString = queryParams.toString();
  const url = `/payments/transactions${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['payments-transactions', filters.startDate, filters.endDate, filters.paymentMethod],
    queryFn: async () => {
      const response = await api.get<TransactionsResponse>(url);
      return response.data.data;
    },
  });
};

/** Hook para obtener la data formateada de un recibo/boleta */
export const useTransactionReceipt = (transactionId: string | null) => {
  return useQuery({
    queryKey: ['transaction-receipt', transactionId],
    queryFn: async () => {
      const response = await api.get<ReceiptResponse>(`/payments/transactions/${transactionId}/receipt`);
      return response.data.data;
    },
    enabled: !!transactionId,
  });
};

/** Mutation para crear una obligación individual */
export const useCreateObligation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateObligationFormData) => {
      const response = await api.post<SingleObligationResponse>('/payments/obligations', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments-obligations'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });
};

/** Mutation para generación masiva de cronogramas */
export const useBulkCreateObligations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BulkCreateObligationsFormData) => {
      const response = await api.post<{
        status: string;
        data: { count: number; skippedCount: number; totalMatriculados: number };
      }>('/payments/obligations/bulk', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments-obligations'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });
};

/** Mutation para registrar un cobro manual */
export const useRegisterTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RegisterTransactionFormData) => {
      const response = await api.post<SingleTransactionResponse>('/payments/transactions', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments-obligations'] });
      queryClient.invalidateQueries({ queryKey: ['parent-payments-obligations'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['payments-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['daily-cash-close'] });
      queryClient.invalidateQueries({ queryKey: ['cash'] });
    },
  });
};

/** Qué puede hacer la persona en caja y tesorería (cajero, tesorero, contador, Dirección) */
export const useFinanceAccess = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['finance-access'],
    queryFn: async () => {
      const response = await api.get<{ status: string; data: FinanceAccess }>('/payments/access');
      return response.data.data;
    },
    enabled,
    staleTime: 60_000,
  });
};

/** Detalle de una cuota con todos sus cobros (vigentes y anulados) */
export const useObligationDetail = (obligationId: string | null) => {
  return useQuery({
    queryKey: ['payment-obligation', obligationId],
    queryFn: async () => {
      const response = await api.get<SingleObligationResponse>(`/payments/obligations/${obligationId}`);
      return response.data.data;
    },
    enabled: !!obligationId,
  });
};

/** Mutation para anular un cobro (el recibo se conserva como ANULADO, con motivo) */
export const useVoidTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transactionId, reason }: { transactionId: string; reason: string }) => {
      const response = await api.post<SingleTransactionResponse>(`/payments/transactions/${transactionId}/void`, { reason });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments-obligations'] });
      queryClient.invalidateQueries({ queryKey: ['parent-payments-obligations'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['payments-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['daily-cash-close'] });
      queryClient.invalidateQueries({ queryKey: ['payment-obligation'] });
      queryClient.invalidateQueries({ queryKey: ['cash'] });
    },
  });
};

/** Mutation para anular una cuota (con motivo; no se borra) */
export const useCancelObligation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ obligationId, reason }: { obligationId: string; reason: string }) => {
      const response = await api.post<SingleObligationResponse>(`/payments/obligations/${obligationId}/cancel`, { reason });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments-obligations'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['payment-obligation'] });
    },
  });
};

/** Mutation para enviar recordatorio por Email individual */
export const useSendReminder = () => {
  return useMutation({
    mutationFn: async ({
      obligationId,
      channel = 'EMAIL',
    }: {
      obligationId: string;
      channel?: 'EMAIL';
    }) => {
      const response = await api.post(`/payments/obligations/${obligationId}/remind`, { channel });
      return response.data.data;
    },
  });
};

/** Mutation para enviar recordatorios masivos por Email a morosos */
export const useSendBulkReminders = () => {
  return useMutation({
    mutationFn: async (channel: 'EMAIL' = 'EMAIL') => {
      const response = await api.post('/payments/obligations/remind-overdue', { channel });
      return response.data.data;
    },
  });
};

export interface UpdateObligationDto {
  amountDue?: number;
  dueDate?: string;
  title?: string;
  notes?: string | null;
  /** Obligatorio cuando cambia el monto. */
  reason?: string | null;
}

/** Mutation para editar una cuota o aplicar descuento */
export const useUpdateObligation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateObligationDto;
    }) => {
      const response = await api.patch<SingleObligationResponse>(
        `/payments/obligations/${id}`,
        data,
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments-obligations'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['parent-payments-obligations'] });
      queryClient.invalidateQueries({ queryKey: ['payments-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['daily-cash-close'] });
    },
  });
};

/** Mutation para crear una obligación/cuota individual para un alumno */
export const useCreateIndividualObligation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateIndividualObligationPayload) => {
      const response = await api.post<SingleObligationResponse>('/payments/obligations', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments-obligations'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['parent-payments-obligations'] });
      queryClient.invalidateQueries({ queryKey: ['payments-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['daily-cash-close'] });
    },
  });
};

/** Hook para obtener el arqueo de caja diario */
export const useDailyCashClose = (date?: string) => {
  return useQuery({
    queryKey: ['daily-cash-close', date],
    queryFn: async () => {
      const response = await api.get<{ status: string; data: DailyCashCloseData }>(
        '/payments/daily-cash-close',
        { params: date ? { date } : {} },
      );
      return response.data.data;
    },
  });
};

