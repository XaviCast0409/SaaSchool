import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { paymentsKeys, invalidatePaymentViews } from './keys';
import type {
  PaymentTransaction,
  ReceiptData,
  TransactionFilterParams,
  FinanceAccess,
} from '../types';
import type { RegisterTransactionFormData } from '../schemas/payment.schema';

interface TransactionsResponse {
  status: string;
  data: PaymentTransaction[];
}

interface SingleTransactionResponse {
  status: string;
  data: PaymentTransaction;
}

interface ReceiptResponse {
  status: string;
  data: ReceiptData;
}

/** Hook para obtener el historial de cobros/transacciones */
export const useTransactions = (filters: TransactionFilterParams = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.startDate) queryParams.append('startDate', filters.startDate);
  if (filters.endDate) queryParams.append('endDate', filters.endDate);
  if (filters.paymentMethod) queryParams.append('paymentMethod', filters.paymentMethod);

  const queryString = queryParams.toString();
  const url = `/payments/transactions${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: paymentsKeys.transactions.list(filters.startDate, filters.endDate, filters.paymentMethod),
    queryFn: async () => (await api.get<TransactionsResponse>(url)).data.data,
  });
};

/** Hook para obtener la data formateada de un recibo/boleta */
export const useTransactionReceipt = (transactionId: string | null) =>
  useQuery({
    queryKey: paymentsKeys.receipt.detail(transactionId),
    queryFn: async () => (await api.get<ReceiptResponse>(`/payments/transactions/${transactionId}/receipt`)).data.data,
    enabled: !!transactionId,
  });

/** Mutation para registrar un cobro manual */
export const useRegisterTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: RegisterTransactionFormData) =>
      (await api.post<SingleTransactionResponse>('/payments/transactions', data)).data.data,
    onSuccess: () => {
      invalidatePaymentViews(queryClient, { parent: true, transactions: true, cashClose: true, cash: true });
    },
  });
};

/** Qué puede hacer la persona en caja y tesorería (cajero, tesorero, contador, Dirección) */
export const useFinanceAccess = (enabled: boolean = true) =>
  useQuery({
    queryKey: paymentsKeys.access.all,
    queryFn: async () => (await api.get<{ status: string; data: FinanceAccess }>('/payments/access')).data.data,
    enabled,
    staleTime: 60_000,
  });

/** Mutation para anular un cobro (el recibo se conserva como ANULADO, con motivo) */
export const useVoidTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ transactionId, reason }: { transactionId: string; reason: string }) =>
      (await api.post<SingleTransactionResponse>(`/payments/transactions/${transactionId}/void`, { reason })).data.data,
    onSuccess: () => {
      invalidatePaymentViews(queryClient, {
        parent: true,
        transactions: true,
        cashClose: true,
        obligationDetail: true,
        cash: true,
      });
    },
  });
};
