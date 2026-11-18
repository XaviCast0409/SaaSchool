import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { paymentsKeys } from './keys';
import { get, invalidateAll } from './financeShared';
import type { PersonRef } from '../types';

export type AdjustmentType = 'DISCOUNT' | 'SCHOLARSHIP' | 'LATE_FEE' | 'CREDIT_NOTE';

export const ADJUSTMENT_LABEL: Record<AdjustmentType, string> = {
  DISCOUNT: 'Descuento',
  SCHOLARSHIP: 'Beca',
  LATE_FEE: 'Mora',
  CREDIT_NOTE: 'Nota de crédito',
};

export interface ObligationAdjustment {
  id: string;
  number: string;
  type: AdjustmentType;
  amount: number;
  reason: string;
  status: 'ACTIVE' | 'VOIDED';
  createdAt: string;
  createdBy?: PersonRef | null;
  voidedBy?: PersonRef | null;
  voidedAt?: string | null;
  voidReason?: string | null;
  scholarship?: { id: string; name: string } | null;
  obligation?: {
    title: string;
    concept: string;
    enrollment: {
      student: { firstNames: string; lastNamePaternal: string; lastNameMaternal: string; documentId: string | null };
      classroom: { grade: number; section: string };
    };
  };
}

export const useCreateAdjustment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      obligationId: string;
      type: 'DISCOUNT' | 'LATE_FEE' | 'CREDIT_NOTE';
      amount: number;
      reason: string;
    }) => (await api.post<{ data: ObligationAdjustment }>('/payments/adjustments', body)).data.data,
    onSuccess: () => invalidateAll(qc),
  });
};

export const useVoidAdjustment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      (await api.post(`/payments/adjustments/${id}/void`, { reason })).data.data,
    onSuccess: () => invalidateAll(qc),
  });
};

export const useAdjustments = (
  filters: { startDate?: string; endDate?: string; type?: AdjustmentType },
  enabled = true,
) =>
  useQuery({
    queryKey: paymentsKeys.adjustments.list(filters),
    queryFn: () => get<ObligationAdjustment[]>('/payments/adjustments', filters),
    enabled,
  });
