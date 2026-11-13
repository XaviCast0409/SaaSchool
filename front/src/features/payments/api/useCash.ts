import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { CashExpense, CashSession, CashSessionDetail, CashSessionStatus, PersonRef } from '../types';

/** Caja diaria: apertura, cierre con arqueo, revisión y egresos de caja chica. */

const invalidateCash = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['cash'] });
  qc.invalidateQueries({ queryKey: ['daily-cash-close'] });
  qc.invalidateQueries({ queryKey: ['payments-transactions'] });
};

export interface CurrentCash {
  session: CashSessionDetail | null;
  lastSession: {
    id: string;
    status: CashSessionStatus;
    closedAt: string | null;
    difference: number | null;
    countedCash: number | null;
    openedAt: string;
  } | null;
}

export const useCurrentCash = (enabled = true) =>
  useQuery({
    queryKey: ['cash', 'current'],
    queryFn: async () => (await api.get<{ data: CurrentCash }>('/payments/cash/current')).data.data,
    enabled,
  });

export interface CashSessionFilters {
  status?: CashSessionStatus;
  cashierId?: string;
  startDate?: string;
  endDate?: string;
}

export const useCashSessions = (filters: CashSessionFilters, enabled = true) =>
  useQuery({
    queryKey: ['cash', 'sessions', filters],
    queryFn: async () =>
      (await api.get<{ data: CashSession[] }>('/payments/cash/sessions', { params: filters })).data.data,
    enabled,
  });

export const useCashSession = (id: string | null) =>
  useQuery({
    queryKey: ['cash', 'session', id],
    queryFn: async () => (await api.get<{ data: CashSessionDetail }>(`/payments/cash/sessions/${id}`)).data.data,
    enabled: !!id,
  });

export const useCashiers = (enabled = true) =>
  useQuery({
    queryKey: ['cash', 'cashiers'],
    queryFn: async () => (await api.get<{ data: PersonRef[] }>('/payments/cash/cashiers')).data.data,
    enabled,
  });

export const useOpenCash = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { openingAmount: number; openingNote?: string }) =>
      (await api.post('/payments/cash/open', body)).data.data,
    onSuccess: () => invalidateCash(qc),
  });
};

export const useCloseCash = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; countedCash: number; closingNote?: string }) =>
      (await api.post(`/payments/cash/sessions/${id}/close`, body)).data.data as CashSession,
    onSuccess: () => invalidateCash(qc),
  });
};

export const useReviewCash = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reviewNote }: { id: string; reviewNote?: string }) =>
      (await api.post(`/payments/cash/sessions/${id}/review`, { reviewNote })).data.data,
    onSuccess: () => invalidateCash(qc),
  });
};

export const useReopenCash = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      (await api.post(`/payments/cash/sessions/${id}/reopen`, { reason })).data.data,
    onSuccess: () => invalidateCash(qc),
  });
};

export interface CreateExpenseBody {
  category: string;
  description: string;
  amount: number;
  beneficiary?: string;
  documentType?: string;
  documentNumber?: string;
}

export const useCreateExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateExpenseBody) =>
      (await api.post<{ data: CashExpense }>('/payments/cash/expenses', body)).data.data,
    onSuccess: () => invalidateCash(qc),
  });
};

export const useVoidExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      (await api.post(`/payments/cash/expenses/${id}/void`, { reason })).data.data,
    onSuccess: () => invalidateCash(qc),
  });
};

/** Mensaje de error del backend en español (o uno genérico). */
export const apiError = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
