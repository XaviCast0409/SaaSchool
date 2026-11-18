import type { QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { paymentsKeys } from './keys';

export const get = async <T>(url: string, params?: Record<string, unknown>) =>
  (await api.get<{ data: T }>(url, { params })).data.data;

export const invalidateAll = (qc: QueryClient) => {
  for (const key of [
    paymentsKeys.obligations.all[0],
    paymentsKeys.obligationDetail.all[0],
    paymentsKeys.summary.all[0],
    paymentsKeys.scholarships.all[0],
    paymentsKeys.lateFees.all[0],
    paymentsKeys.adjustments.all[0],
    paymentsKeys.statement.all[0],
  ]) {
    qc.invalidateQueries({ queryKey: [key] });
  }
};
