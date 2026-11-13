import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { PaymentMethod, PersonRef } from '../types';

/** Ajustes (descuentos, becas, moras, notas de crédito), estados de cuenta y reportes. */

export type AdjustmentType = 'DISCOUNT' | 'SCHOLARSHIP' | 'LATE_FEE' | 'CREDIT_NOTE';

export const ADJUSTMENT_LABEL: Record<AdjustmentType, string> = {
  DISCOUNT: 'Descuento',
  SCHOLARSHIP: 'Beca',
  LATE_FEE: 'Mora',
  CREDIT_NOTE: 'Nota de crédito',
};

export interface ObligationAdjustment {
  id: string;
  number: string;
  type: AdjustmentType;
  amount: number;
  reason: string;
  status: 'ACTIVE' | 'VOIDED';
  createdAt: string;
  createdBy?: PersonRef | null;
  voidedBy?: PersonRef | null;
  voidedAt?: string | null;
  voidReason?: string | null;
  scholarship?: { id: string; name: string } | null;
  obligation?: {
    title: string;
    concept: string;
    enrollment: {
      student: { firstNames: string; lastNamePaternal: string; lastNameMaternal: string; documentId: string | null };
      classroom: { grade: number; section: string };
    };
  };
}

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
    student: { id: string; firstNames: string; lastNamePaternal: string; lastNameMaternal: string; documentId: string | null };
    classroom: { grade: number; section: string; educationLevel: string };
  };
  _count: { adjustments: number };
}

export interface FinanceSettings {
  lateFeeAnnualRate: number | null;
  lateFeeGraceDays: number;
}

export interface LateFeeRow {
  obligationId: string;
  title: string;
  dueDate: string;
  daysOverdue: number;
  balance: number;
  alreadyCharged: number;
  interestToDate: number;
  pending: number;
  student: { firstNames: string; lastNamePaternal: string; lastNameMaternal: string; documentId: string | null };
  classroom: { grade: number; section: string };
}

export interface StatementTotals {
  original: number;
  discounts: number;
  lateFees: number;
  net: number;
  paid: number;
  balance: number;
  overdue: number;
}

export interface StatementObligation extends StatementTotals {
  id: string;
  title: string;
  concept: string;
  dueDate: string;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED';
  cancelReason?: string | null;
  daysOverdue: number;
  adjustments: Array<{ id: string; number: string; type: AdjustmentType; amount: number; reason: string; status: 'ACTIVE' | 'VOIDED'; createdAt: string; voidReason?: string | null }>;
  payments: Array<{
    id: string;
    receiptNumber: string | null;
    paymentDate: string;
    paymentMethod: PaymentMethod;
    operationNumber: string | null;
    amountPaid: number;
    status: 'ACTIVE' | 'VOIDED';
    voidReason?: string | null;
    collectedBy?: PersonRef | null;
  }>;
}

export interface StudentStatement {
  student: { id: string; fullName: string; documentId: string | null; studentCode: string | null; classroom: string | null; year: number | null };
  guardians: Array<{ id: string; firstName: string; lastNamePaternal: string; lastNameMaternal: string; cellphone: string | null; email: string | null; relationshipType: string; isFinancialResponsible: boolean }>;
  obligations: StatementObligation[];
  totals: StatementTotals;
  generatedAt: string;
}

export interface FamilyStatement {
  guardian: { id: string; fullName: string; documentId: string | null; cellphone: string | null; email: string | null };
  children: StudentStatement[];
  totals: StatementTotals;
  generatedAt: string;
}

export interface GroupRow {
  key: string;
  total: number;
  count: number;
}

export interface CollectionsReport {
  rows: Array<{
    id: string;
    receiptNumber: string | null;
    paymentDate: string;
    paymentMethod: PaymentMethod;
    operationNumber: string | null;
    amountPaid: number;
    collectedBy: PersonRef | null;
    obligation: {
      title: string;
      concept: string;
      enrollment: { student: { firstNames: string; lastNamePaternal: string; lastNameMaternal: string; documentId: string | null }; classroom: { grade: number; section: string } };
    };
  }>;
  total: number;
  count: number;
  voided: { count: number; total: number };
  byDay: GroupRow[];
  byMethod: GroupRow[];
  byConcept: GroupRow[];
  byCashier: GroupRow[];
}

export type AgingBucket = '0-30' | '31-60' | '61-90' | '90+';
export const AGING_BUCKETS: AgingBucket[] = ['0-30', '31-60', '61-90', '90+'];

export interface AgingReport {
  asOf: string;
  rows: Array<{
    studentId: string;
    student: string;
    documentId: string | null;
    classroom: string;
    guardian: string;
    phone: string | null;
    email: string | null;
    cuotas: number;
    oldestDueDate: string;
    maxDays: number;
    buckets: Record<AgingBucket, number>;
    total: number;
    items: Array<{ title: string; dueDate: string; days: number; balance: number }>;
  }>;
  buckets: Record<AgingBucket, number>;
  total: number;
  students: number;
}

export interface MonthlyRow {
  month: number;
  original: number;
  discounts: number;
  lateFees: number;
  net: number;
  paid: number;
  balance: number;
  cashIn: number;
  expenses: number;
}

export interface MonthlyReport {
  year: number;
  months: MonthlyRow[];
  totals: Omit<MonthlyRow, 'month'>;
}

const get = async <T,>(url: string, params?: Record<string, unknown>) => (await api.get<{ data: T }>(url, { params })).data.data;

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) => {
  for (const key of ['payments-obligations', 'payment-obligation', 'financial-summary', 'scholarships', 'late-fees', 'adjustments', 'statement']) {
    qc.invalidateQueries({ queryKey: [key] });
  }
};

// ── Ajustes ───────────────────────────────────────────────────────
export const useCreateAdjustment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { obligationId: string; type: 'DISCOUNT' | 'LATE_FEE' | 'CREDIT_NOTE'; amount: number; reason: string }) =>
      (await api.post<{ data: ObligationAdjustment }>('/payments/adjustments', body)).data.data,
    onSuccess: () => invalidateAll(qc),
  });
};

export const useVoidAdjustment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => (await api.post(`/payments/adjustments/${id}/void`, { reason })).data.data,
    onSuccess: () => invalidateAll(qc),
  });
};

export const useAdjustments = (filters: { startDate?: string; endDate?: string; type?: AdjustmentType }, enabled = true) =>
  useQuery({ queryKey: ['adjustments', filters], queryFn: () => get<ObligationAdjustment[]>('/payments/adjustments', filters), enabled });

// ── Becas ─────────────────────────────────────────────────────────
export const useScholarships = (activeOnly: boolean) =>
  useQuery({ queryKey: ['scholarships', activeOnly], queryFn: () => get<Scholarship[]>('/payments/scholarships', { activeOnly: String(activeOnly) }) });

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
    mutationFn: async (id: string) => (await api.post<{ data: { applied: number; skipped: number } }>(`/payments/scholarships/${id}/apply`, {})).data.data,
    onSuccess: () => invalidateAll(qc),
  });
};

export const useDeactivateScholarship = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason, revertPending }: { id: string; reason: string; revertPending: boolean }) =>
      (await api.post<{ data: { reverted: number } }>(`/payments/scholarships/${id}/deactivate`, { reason, revertPending })).data.data,
    onSuccess: () => invalidateAll(qc),
  });
};

// ── Moras ─────────────────────────────────────────────────────────
export const useFinanceSettings = () => useQuery({ queryKey: ['late-fees', 'settings'], queryFn: () => get<FinanceSettings>('/payments/finance-settings') });

export const useUpdateFinanceSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: FinanceSettings) => (await api.put<{ data: FinanceSettings }>('/payments/finance-settings', body)).data.data,
    onSuccess: () => invalidateAll(qc),
  });
};

export const useLateFeePreview = (enabled = true) =>
  useQuery({
    queryKey: ['late-fees', 'preview'],
    queryFn: () => get<{ settings: FinanceSettings; rows: LateFeeRow[]; total: number }>('/payments/late-fees/preview'),
    enabled,
  });

export const useApplyLateFees = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (obligationIds: string[]) =>
      (await api.post<{ data: { applied: number; total: number } }>('/payments/late-fees/apply', { obligationIds })).data.data,
    onSuccess: () => invalidateAll(qc),
  });
};

// ── Estados de cuenta ─────────────────────────────────────────────
export const useStudentStatement = (studentId: string | null) =>
  useQuery({ queryKey: ['statement', 'student', studentId], queryFn: () => get<StudentStatement>(`/payments/statements/student/${studentId}`), enabled: !!studentId });

export const useFamilyStatement = (userId: string | null) =>
  useQuery({ queryKey: ['statement', 'family', userId], queryFn: () => get<FamilyStatement>(`/payments/statements/family/${userId}`), enabled: !!userId });

export const useMyStatement = (enabled: boolean) =>
  useQuery({ queryKey: ['statement', 'mine'], queryFn: () => get<FamilyStatement>('/payments/statements/mine'), enabled });

export interface GuardianOption {
  id: string;
  firstName: string;
  lastNamePaternal: string;
  lastNameMaternal: string;
  documentId: string | null;
  familyRelations: Array<{ student: { id: string; firstNames: string; lastNamePaternal: string } }>;
}

export const useGuardianSearch = (search: string) =>
  useQuery({
    queryKey: ['statement', 'guardians', search],
    queryFn: () => get<GuardianOption[]>('/payments/statements/guardians', { search }),
    enabled: search.trim().length >= 2,
  });

// ── Reportes ──────────────────────────────────────────────────────
export const useCollectionsReport = (f: { startDate?: string; endDate?: string; cashierId?: string; method?: string; concept?: string }) =>
  useQuery({ queryKey: ['report', 'collections', f], queryFn: () => get<CollectionsReport>('/payments/reports/collections', f) });

export const useAgingReport = (classroomId?: string) =>
  useQuery({ queryKey: ['report', 'aging', classroomId], queryFn: () => get<AgingReport>('/payments/reports/aging', { classroomId }) });

export const useMonthlyReport = (year: number) =>
  useQuery({ queryKey: ['report', 'monthly', year], queryFn: () => get<MonthlyReport>('/payments/reports/monthly', { year }) });
