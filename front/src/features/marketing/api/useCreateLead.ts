import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export type StudentRange = '<150' | '150-500' | '>500';
export type InterestPlan = 'BASIC' | 'PRO' | 'ENTERPRISE';

export interface CreateLeadPayload {
  contactName: string;
  role: string;
  schoolName: string;
  phone: string;
  email?: string;
  city?: string;
  studentRange?: StudentRange | null;
  interestPlan?: InterestPlan | null;
  message?: string;
  source?: string;
  consent: true;
  website?: string; // campo trampa: debe ir vacío
}

/** Envía la solicitud de demostración de la web de marketing (ruta pública, sin sesión). */
export const useCreateLead = () =>
  useMutation({
    mutationFn: async (payload: CreateLeadPayload) => {
      const response = await api.post<{ status: string; data: { id: string | null } }>('/public/leads', payload);
      return response.data.data;
    },
  });
