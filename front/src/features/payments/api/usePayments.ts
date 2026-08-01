import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { PaymentObligation } from '../types';

interface PaymentsResponse {
  status: string;
  data: PaymentObligation[];
}

export const usePayments = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['payments-obligations'],
    queryFn: async () => {
      const response = await api.get<PaymentsResponse>('/payments/obligations');
      return response.data.data;
    },
    enabled,
  });
};
