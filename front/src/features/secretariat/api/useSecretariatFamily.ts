import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { type DocumentType } from './secretariatShared';
import type { DocumentRequestRow } from './useDocumentRequests';
import { secretariatKeys } from './keys';

export interface FamilyProcedures {
  ratification: { open: boolean; year: number | null; deadline: string | null };
  children: Array<{
    studentId: string;
    name: string;
    ratification: { decision: 'CONFIRMED' | 'DECLINED'; comment: string | null; updatedAt: string } | null;
  }>;
  requests: DocumentRequestRow[];
}

export const useFamilyProcedures = () =>
  useQuery({
    queryKey: secretariatKeys.family(),
    queryFn: async () => (await api.get<{ data: FamilyProcedures }>('/secretariat/family')).data.data,
  });

export const useRatify = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { studentId: string; decision: 'CONFIRMED' | 'DECLINED'; comment?: string }) =>
      (await api.post('/secretariat/family/ratify', input)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: secretariatKeys.family() }),
  });
};

export const useRequestDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { studentId: string; type: DocumentType; purpose?: string; copies: number }) =>
      (await api.post<{ data: DocumentRequestRow }>('/secretariat/family/documents', input)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: secretariatKeys.family() }),
  });
};

