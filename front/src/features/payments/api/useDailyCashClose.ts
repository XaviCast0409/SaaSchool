import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { paymentsKeys } from './keys';
import type { DailyCashCloseData } from '../types';

/** Hook para obtener el arqueo de caja diario */
export const useDailyCashClose = (date?: string) => {
  return useQuery({
    queryKey: paymentsKeys.dailyCashClose.detail(date),
    queryFn: async () => {
      const response = await api.get<{ status: string; data: DailyCashCloseData }>('/payments/daily-cash-close', {
        params: date ? { date } : {},
      });
      return response.data.data;
    },
  });
};
