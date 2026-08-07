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

/** Hook para obtener las obligaciones de pago con enabled estricto para evitar peticiones masivas sin sección/búsqueda */
export const usePayments = (filters: ObligationFilterParams = {}, enabledOverride?: boolean) => {
  const queryParams = new URLSearchParams();
  if (filters.page) queryParams.append('page', String(filters.page));
  if (filters.limit) queryParams.append('limit', String(filters.limit));
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.classroomId) queryParams.append('classroomId', filters.classroomId);
  if (filters.enrollmentId) queryParams.append('enrollmentId', filters.enrollmentId);
  if (filters.search) queryParams.append('search', filters.search);

  const queryString = queryParams.toString();
  const url = `/payments/obligations${queryString ? `?${queryString}` : ''}`;

  const isEnabled =
    enabledOverride !== undefined
      ? enabledOverride
      : Boolean(
          filters.classroomId ||
            filters.search ||
            filters.status ||
            filters.enrollmentId
        );

  return useQuery({
    queryKey: ['payments-obligations', filters.page, filters.limit, filters.status, filters.classroomId, filters.search],
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
    },
  });
};

/** Mutation para anular un pago registrado por error */
export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await api.delete<SingleTransactionResponse>(`/payments/transactions/${transactionId}`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments-obligations'] });
      queryClient.invalidateQueries({ queryKey: ['parent-payments-obligations'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['payments-transactions'] });
    },
  });
};

/** Mutation para anular/cancelar una obligación */
export const useCancelObligation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (obligationId: string) => {
      const response = await api.delete<SingleObligationResponse>(`/payments/obligations/${obligationId}`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments-obligations'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });
};

/** Mutation para enviar recordatorio WA/Email individual */
export const useSendReminder = () => {
  return useMutation({
    mutationFn: async ({
      obligationId,
      channel = 'BOTH',
    }: {
      obligationId: string;
      channel?: 'WHATSAPP' | 'EMAIL' | 'BOTH';
    }) => {
      const response = await api.post(`/payments/obligations/${obligationId}/remind`, { channel });
      return response.data.data;
    },
  });
};

/** Mutation para enviar recordatorios masivos a morosos */
export const useSendBulkReminders = () => {
  return useMutation({
    mutationFn: async (channel: 'WHATSAPP' | 'EMAIL' | 'BOTH' = 'BOTH') => {
      const response = await api.post('/payments/obligations/remind-overdue', { channel });
      return response.data.data;
    },
  });
};
