import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { KEY } from './secretariatShared';
import { secretariatKeys } from './keys';

export interface Complaint {
  id: string;
  code: string;
  kind: 'RECLAMO' | 'QUEJA';
  status: 'OPEN' | 'ANSWERED';
  consumerName: string;
  consumerDocType: string;
  consumerDocId: string;
  consumerAddress: string | null;
  consumerPhone: string | null;
  consumerEmail: string;
  isMinor: boolean;
  guardianName: string | null;
  itemType: string;
  itemDescription: string;
  amount: string | null;
  detail: string;
  request: string;
  dueDate: string;
  response: string | null;
  respondedAt: string | null;
  respondedBy: string | null;
  createdAt: string;
  daysLeft: number | null;
}

export const useComplaints = (enabled = true) =>
  useQuery({
    queryKey: secretariatKeys.complaints(),
    enabled,
    queryFn: async () => (await api.get<{ data: Complaint[] }>('/secretariat/complaints')).data.data,
  });

export const useRespondComplaint = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, response }: { id: string; response: string }) =>
      (await api.post(`/secretariat/complaints/${id}/respond`, { response })).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

