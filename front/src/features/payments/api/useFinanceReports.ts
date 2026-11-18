import { useQuery } from '@tanstack/react-query';
import { paymentsKeys } from './keys';
import { get } from './financeShared';
import type { PaymentMethod, PersonRef } from '../types';

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
      enrollment: {
        student: { firstNames: string; lastNamePaternal: string; lastNameMaternal: string; documentId: string | null };
        classroom: { grade: number; section: string };
      };
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

export const useCollectionsReport = (f: {
  startDate?: string;
  endDate?: string;
  cashierId?: string;
  method?: string;
  concept?: string;
}) =>
  useQuery({
    queryKey: paymentsKeys.report.collections(f),
    queryFn: () => get<CollectionsReport>('/payments/reports/collections', f),
  });

export const useAgingReport = (classroomId?: string) =>
  useQuery({
    queryKey: paymentsKeys.report.aging(classroomId),
    queryFn: () => get<AgingReport>('/payments/reports/aging', { classroomId }),
  });

export const useMonthlyReport = (year: number) =>
  useQuery({
    queryKey: paymentsKeys.report.monthly(year),
    queryFn: () => get<MonthlyReport>('/payments/reports/monthly', { year }),
  });
