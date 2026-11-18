import type { QueryClient } from '@tanstack/react-query';
import type { ObligationFilterParams, TransactionFilterParams, CashSessionStatus } from '../types';

export const feeSchedules = {
  all: ['fee-schedules'] as const,
  byYear: (academicYearId?: string) => ['fee-schedules', academicYearId] as const,
} as const;

export interface CashSessionFilters {
  status?: CashSessionStatus;
  cashierId?: string;
  startDate?: string;
  endDate?: string;
}

export const paymentsKeys = {
  obligations: {
    all: ['payments-obligations'] as const,
    list: (filters: ObligationFilterParams = {}) => [
      'payments-obligations',
      filters.page,
      filters.limit,
      filters.status,
      filters.classroomId,
      filters.search,
      filters.overdue,
    ] as const,
  },
  parentObligations: {
    all: ['parent-payments-obligations'] as const,
    root: () => ['parent-payments-obligations'] as const,
  },
  summary: {
    all: ['financial-summary'] as const,
    root: () => ['financial-summary'] as const,
  },
  transactions: {
    all: ['payments-transactions'] as const,
    list: (startDateOrFilters?: string | TransactionFilterParams, endDate?: string, paymentMethod?: string) => {
      if (typeof startDateOrFilters === 'object' && startDateOrFilters !== null) {
        return [
          'payments-transactions',
          startDateOrFilters.startDate,
          startDateOrFilters.endDate,
          startDateOrFilters.paymentMethod,
        ] as const;
      }
      return ['payments-transactions', startDateOrFilters, endDate, paymentMethod] as const;
    },
  },
  receipt: {
    all: ['transaction-receipt'] as const,
    detail: (transactionId: string | null) => ['transaction-receipt', transactionId] as const,
  },
  access: {
    all: ['finance-access'] as const,
    root: () => ['finance-access'] as const,
  },
  obligationDetail: {
    all: ['payment-obligation'] as const,
    detail: (obligationId: string | null) => ['payment-obligation', obligationId] as const,
  },
  dailyCashClose: {
    all: ['daily-cash-close'] as const,
    detail: (date?: string) => ['daily-cash-close', date] as const,
  },
  cash: {
    all: ['cash'] as const,
    current: () => ['cash', 'current'] as const,
    sessions: (filters?: CashSessionFilters) => ['cash', 'sessions', filters] as const,
    session: (id: string | null) => ['cash', 'session', id] as const,
    cashiers: () => ['cash', 'cashiers'] as const,
  },
  feeSchedules,
  schedulePreview: {
    all: ['schedule-preview'] as const,
    detail: (input?: { academicYearId?: string; classroomId?: string; condition?: string }) =>
      ['schedule-preview', input] as const,
  },
  adjustments: {
    all: ['adjustments'] as const,
    list: (filters?: { startDate?: string; endDate?: string; type?: string }) =>
      ['adjustments', filters] as const,
  },
  scholarships: {
    all: ['scholarships'] as const,
    list: (activeOnly?: boolean) => ['scholarships', activeOnly] as const,
  },
  lateFees: {
    all: ['late-fees'] as const,
    settings: () => ['late-fees', 'settings'] as const,
    preview: () => ['late-fees', 'preview'] as const,
  },
  statement: {
    all: ['statement'] as const,
    student: (studentId: string | null) => ['statement', 'student', studentId] as const,
    family: (userId: string | null) => ['statement', 'family', userId] as const,
    mine: () => ['statement', 'mine'] as const,
    guardians: (search: string) => ['statement', 'guardians', search] as const,
  },
  report: {
    all: ['report'] as const,
    collections: (f?: { startDate?: string; endDate?: string; cashierId?: string; method?: string; concept?: string }) =>
      ['report', 'collections', f] as const,
    aging: (classroomId?: string) => ['report', 'aging', classroomId] as const,
    monthly: (year: number) => ['report', 'monthly', year] as const,
    expenses: (r?: { startDate: string; endDate: string }) => ['report', 'expenses', r] as const,
  },
} as const;

export interface InvalidatePaymentOptions {
  parent?: boolean;
  transactions?: boolean;
  cashClose?: boolean;
  obligationDetail?: boolean;
  cash?: boolean;
}

export function invalidatePaymentViews(qc: QueryClient, opts: InvalidatePaymentOptions = {}) {
  qc.invalidateQueries({ queryKey: paymentsKeys.obligations.all });
  if (opts.parent) qc.invalidateQueries({ queryKey: paymentsKeys.parentObligations.all });
  qc.invalidateQueries({ queryKey: paymentsKeys.summary.all });
  if (opts.transactions) qc.invalidateQueries({ queryKey: paymentsKeys.transactions.all });
  if (opts.cashClose) qc.invalidateQueries({ queryKey: paymentsKeys.dailyCashClose.all });
  if (opts.obligationDetail) qc.invalidateQueries({ queryKey: paymentsKeys.obligationDetail.all });
  if (opts.cash) qc.invalidateQueries({ queryKey: paymentsKeys.cash.all });
}

export function invalidateCashViews(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: paymentsKeys.cash.all });
  qc.invalidateQueries({ queryKey: paymentsKeys.dailyCashClose.all });
  qc.invalidateQueries({ queryKey: paymentsKeys.transactions.all });
}
