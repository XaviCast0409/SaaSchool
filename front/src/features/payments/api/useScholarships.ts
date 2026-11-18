import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { paymentsKeys } from './keys';
import { get, invalidateAll } from './financeShared';
import type { PersonRef } from '../types';

export interface Scholarship {
  id: string;
  name: string;
  kind: 'PERCENT' | 'FIXED';
  value: number;
  concepts: string[];
  validFrom: string;
  validTo: string | null;
  reason: string;
  isActive: boolean;
  createdAt: string;
  createdBy?: PersonRef | null;
  deactivatedBy?: PersonRef | null;
  deactivatedAt?: string | null;
  deactivationReason?: string | null;
  enrollment: {
    id: string;
    student: {
      id: string;
      firstNames: string;
      lastNamePaternal: string;
      lastNameMaternal: string;
      documentId: string | null;
    };
    classroom: { grade: number; section: string; educationLevel: string };
  };
  _count: { adjustments: number };
}

export interface CreateScholarshipBody {
  studentId: string;
  name: string;
  kind: 'PERCENT' | 'FIXED';
  value: number;
  concepts: string[];
  validFrom: string;
  validTo?: string | null;
  reason: string;
  applyNow: boolean;
}

export const useScholarships = (activeOnly: boolean) =>
  useQuery({
    queryKey: paymentsKeys.scholarships.list(activeOnly),
    queryFn: () => get<Scholarship[]>('/payments/scholarships', { activeOnly: String(activeOnly) }),
  });

export const useCreateScholarship = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateScholarshipBody) =>
      (await api.post<{ data: { applied: number; skipped: number } }>('/payments/scholarships', body)).data.data,
    onSuccess: () => invalidateAll(qc),
  });
};

export const useApplyScholarship = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.post<{ data: { applied: number; skipped: number } }>(`/payments/scholarships/${id}/apply`, {})).data
        .data,
    onSuccess: () => invalidateAll(qc),
  });
};

export const useDeactivateScholarship = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason, revertPending }: { id: string; reason: string; revertPending: boolean }) =>
      (
        await api.post<{ data: { reverted: number } }>(`/payments/scholarships/${id}/deactivate`, {
          reason,
          revertPending,
        })
      ).data.data,
    onSuccess: () => invalidateAll(qc),
  });
};
