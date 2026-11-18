import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export type LeadStatus = 'NEW' | 'CONTACTED' | 'DEMO_SCHEDULED' | 'WON' | 'LOST';

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'Nuevo',
  CONTACTED: 'Contactado',
  DEMO_SCHEDULED: 'Demo agendada',
  WON: 'Cliente',
  LOST: 'Descartado',
};

export interface SalesLead {
  id: string;
  contactName: string;
  role: string;
  schoolName: string;
  phone: string;
  email: string | null;
  city: string | null;
  studentRange: string | null;
  interestPlan: string | null;
  message: string | null;
  source: string | null;
  score: number;
  status: LeadStatus;
  notes: string | null;
  createdAt: string;
}

interface LeadsResponse {
  leads: SalesLead[];
  counts: Record<LeadStatus, number>;
}

/** Bandeja de leads de la web de marketing (solo SUPER_ADMIN). */
export const useLeads = (status?: LeadStatus) =>
  useQuery({
    queryKey: ['platform-leads', status ?? 'ALL'],
    queryFn: async () => {
      const response = await api.get<{ status: string; data: LeadsResponse }>('/leads', {
        params: status ? { status } : {},
      });
      return response.data.data;
    },
    refetchInterval: 60_000,
  });

export const useUpdateLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; status?: LeadStatus; notes?: string | null }) => {
      const response = await api.patch<{ status: string; data: SalesLead }>(`/leads/${id}`, payload);
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform-leads'] }),
  });
};
