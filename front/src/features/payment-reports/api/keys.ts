export type ReportStatusKey = 'PENDING' | 'APPROVED' | 'REJECTED';

export const paymentReportsKeys = {
  all: ['payment-reports'] as const,
  instructions: () => ['payment-reports', 'instructions'] as const,
  mine: () => ['payment-reports', 'mine'] as const,
  treasury: (status: ReportStatusKey | string) => ['payment-reports', 'treasury', status] as const,
  pendingCount: () => ['payment-reports', 'pending-count'] as const,
} as const;
