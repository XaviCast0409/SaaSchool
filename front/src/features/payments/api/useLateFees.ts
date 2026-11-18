import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { paymentsKeys } from './keys';
import { get, invalidateAll } from './financeShared';

export interface FinanceSettings {
  lateFeeAnnualRate: number | null;
  lateFeeGraceDays: number;
}

export interface LateFeeRow {
  obligationId: string;
  title: string;
  dueDate: string;
  daysOverdue: number;
  balance: number;
  alreadyCharged: number;
  interestToDate: number;
  pending: number;
  student: { firstNames: string; lastNamePaternal: string; lastNameMaternal: string; documentId: string | null };
  classroom: { grade: number; section: string };
}

export const useFinanceSettings = () =>
  useQuery({ queryKey: paymentsKeys.lateFees.settings(), queryFn: () => get<FinanceSettings>('/payments/finance-settings') });

export const useUpdateFinanceSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: FinanceSettings) =>
      (await api.put<{ data: FinanceSettings }>('/payments/finance-settings', body)).data.data,
    onSuccess: () => invalidateAll(qc),
  });
};

export const useLateFeePreview = (enabled = true) =>
  useQuery({
    queryKey: paymentsKeys.lateFees.preview(),
    queryFn: () => get<{ settings: FinanceSettings; rows: LateFeeRow[]; total: number }>('/payments/late-fees/preview'),
    enabled,
  });

export const useApplyLateFees = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (obligationIds: string[]) =>
      (await api.post<{ data: { applied: number; total: number } }>('/payments/late-fees/apply', { obligationIds }))
        .data.data,
    onSuccess: () => invalidateAll(qc),
  });
};
