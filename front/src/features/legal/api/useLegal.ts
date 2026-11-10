import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { toast } from 'sonner';

export type LegalDocType = 'PRIVACY_POLICY' | 'TERMS' | 'MINOR_DATA_CONSENT';

export interface PendingLegalDoc {
  type: LegalDocType;
  version: string;
}

export interface LegalStatusResponse {
  status: string;
  data: {
    pending: PendingLegalDoc[];
  };
}

export const useLegalStatus = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['legal-status'],
    queryFn: async (): Promise<PendingLegalDoc[]> => {
      const response = await api.get<LegalStatusResponse>('/legal/status');
      return response.data.data.pending;
    },
    staleTime: Infinity,
    enabled: options?.enabled ?? true,
  });
};

export const useAcceptLegal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documents: LegalDocType[]) => {
      const response = await api.post('/legal/accept', { documents });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-status'] });
      toast.success('Consentimientos registrados correctamente.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al registrar los consentimientos.');
    },
  });
};
