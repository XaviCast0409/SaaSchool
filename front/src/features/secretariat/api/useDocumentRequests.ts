import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { KEY, type DocumentStatus, type DocumentType } from './secretariatShared';
import { secretariatKeys } from './keys';

export interface DocumentRequestRow {
  id: string;
  type: DocumentType;
  typeLabel: string;
  purpose: string | null;
  copies: number;
  status: DocumentStatus;
  debtHold: boolean;
  staffNote: string | null;
  fileUrl: string | null;
  createdAt: string;
  studentId: string;
  studentName?: string;
  requestedBy?: string;
  requestedByPhone?: string | null;
}

export const useDocumentRequests = (status?: DocumentStatus) =>
  useQuery({
    queryKey: secretariatKeys.documents(status),
    queryFn: async () =>
      (await api.get<{ data: DocumentRequestRow[] }>('/secretariat/documents', { params: { status } })).data.data,
  });

/** Trámite pedido en ventanilla (lo registra Secretaría en nombre de la familia). */
export const useCreateDocumentAtDesk = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      studentId: string;
      type: DocumentType;
      purpose?: string;
      copies: number;
      requesterName: string;
    }) => (await api.post<{ data: DocumentRequestRow }>('/secretariat/documents', input)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useUpdateDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      status?: DocumentStatus;
      staffNote?: string | null;
      fileUrl?: string | null;
      releaseHold?: boolean;
    }) => (await api.patch(`/secretariat/documents/${id}`, input)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

