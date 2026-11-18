import { useQuery } from '@tanstack/react-query';
import { paymentsKeys } from './keys';
import { get } from './financeShared';
import type { AdjustmentType } from './useAdjustments';
import type { PaymentMethod, PersonRef } from '../types';

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
  adjustments: Array<{
    id: string;
    number: string;
    type: AdjustmentType;
    amount: number;
    reason: string;
    status: 'ACTIVE' | 'VOIDED';
    createdAt: string;
    voidReason?: string | null;
  }>;
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
  student: {
    id: string;
    fullName: string;
    documentId: string | null;
    studentCode: string | null;
    classroom: string | null;
    year: number | null;
  };
  guardians: Array<{
    id: string;
    firstName: string;
    lastNamePaternal: string;
    lastNameMaternal: string;
    cellphone: string | null;
    email: string | null;
    relationshipType: string;
    isFinancialResponsible: boolean;
  }>;
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

export interface GuardianOption {
  id: string;
  firstName: string;
  lastNamePaternal: string;
  lastNameMaternal: string;
  documentId: string | null;
  familyRelations: Array<{ student: { id: string; firstNames: string; lastNamePaternal: string } }>;
}

export const useStudentStatement = (studentId: string | null) =>
  useQuery({
    queryKey: paymentsKeys.statement.student(studentId),
    queryFn: () => get<StudentStatement>(`/payments/statements/student/${studentId}`),
    enabled: !!studentId,
  });

export const useFamilyStatement = (userId: string | null) =>
  useQuery({
    queryKey: paymentsKeys.statement.family(userId),
    queryFn: () => get<FamilyStatement>(`/payments/statements/family/${userId}`),
    enabled: !!userId,
  });

export const useMyStatement = (enabled: boolean) =>
  useQuery({
    queryKey: paymentsKeys.statement.mine(),
    queryFn: () => get<FamilyStatement>('/payments/statements/mine'),
    enabled,
  });

export const useGuardianSearch = (search: string) =>
  useQuery({
    queryKey: paymentsKeys.statement.guardians(search),
    queryFn: () => get<GuardianOption[]>('/payments/statements/guardians', { search }),
    enabled: search.trim().length >= 2,
  });
