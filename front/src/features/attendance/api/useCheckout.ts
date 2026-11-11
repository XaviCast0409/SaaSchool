import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import type { CheckoutPreviewData, CheckoutPayload, AttendanceRecord } from '../types';

export const useCheckoutPreview = (code?: string | null) => {
  return useQuery({
    queryKey: ['checkout-preview', code],
    queryFn: async (): Promise<CheckoutPreviewData> => {
      const res = await api.get<{ status: string; data: CheckoutPreviewData }>(
        `/attendance/checkout/preview?code=${encodeURIComponent(code!)}`,
      );
      return res.data.data;
    },
    enabled: Boolean(code && code.trim().length > 0),
    retry: false,
  });
};

export const useCheckout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: CheckoutPayload,
    ): Promise<{ message: string; attendance: AttendanceRecord }> => {
      const res = await api.post<{
        status: string;
        data: { message: string; attendance: AttendanceRecord };
      }>('/attendance/checkout', payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
      toast.success(data.message || 'Salida registrada con éxito.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al registrar la salida.');
    },
  });
};
