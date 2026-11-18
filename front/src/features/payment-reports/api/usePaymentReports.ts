import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { compressImageForUpload } from '@/lib/imageResize';
import { paymentReportsKeys } from './keys';
import { paymentsKeys } from '@/features/payments/api/keys';

export type ReportMethod = 'YAPE' | 'PLIN' | 'BANK_TRANSFER' | 'DEPOSIT';
export const METHOD_LABEL: Record<ReportMethod, string> = {
  YAPE: 'Yape',
  PLIN: 'Plin',
  BANK_TRANSFER: 'Transferencia',
  DEPOSIT: 'Depósito',
};
export type ReportStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PaymentInstructions {
  paymentQrFileUrl: string | null;
  paymentInstructions: string | null;
}

export interface MyPaymentReport {
  id: string;
  obligationId: string;
  amount: string | number;
  method: ReportMethod;
  operationNumber: string;
  paidOn: string;
  status: ReportStatus;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  obligation: { title: string };
  transaction: { id: string; receiptNumber: string | null } | null;
}

export interface TreasuryReport {
  id: string;
  amount: number;
  method: ReportMethod;
  operationNumber: string;
  paidOn: string;
  voucherFileUrl: string | null;
  note: string | null;
  status: ReportStatus;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  receiptNumber: string | null;
  reportedBy: string;
  reportedByPhone: string | null;
  obligation: { id: string; title: string; dueDate: string; balance: number };
  student: string;
  classroom: string;
}

export const usePaymentInstructions = () =>
  useQuery({
    queryKey: paymentReportsKeys.instructions(),
    queryFn: async () => (await api.get<{ data: PaymentInstructions }>('/payment-reports/instructions')).data.data,
    // Alimenta un formulario editable: no se recarga sola para no pisar lo que se está escribiendo
    refetchOnWindowFocus: false,
  });

export const useSavePaymentInstructions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PaymentInstructions) => (await api.put('/payment-reports/instructions', input)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: paymentReportsKeys.instructions() }),
  });
};

export const useMyPaymentReports = (enabled: boolean) =>
  useQuery({
    queryKey: paymentReportsKeys.mine(),
    enabled,
    queryFn: async () => (await api.get<{ data: MyPaymentReport[] }>('/payment-reports/mine')).data.data,
  });

export const useTreasuryReports = (status: ReportStatus, enabled: boolean) =>
  useQuery({
    queryKey: paymentReportsKeys.treasury(status),
    enabled,
    queryFn: async () =>
      (await api.get<{ data: TreasuryReport[] }>('/payment-reports', { params: { status } })).data.data,
    refetchInterval: status === 'PENDING' ? 30_000 : false,
  });

export const usePendingReportsCount = (enabled: boolean) =>
  useQuery({
    queryKey: paymentReportsKeys.pendingCount(),
    enabled,
    queryFn: async () => (await api.get<{ data: { count: number } }>('/payment-reports/pending-count')).data.data.count,
    refetchInterval: 60_000,
    retry: false,
  });

export const useUploadVoucher = () =>
  useMutation({
    mutationFn: async ({ file, purpose }: { file: File; purpose: 'PAYMENT_VOUCHER' | 'SCHOOL_ASSET' }) => {
      const form = new FormData();
      form.append('purpose', purpose);
      form.append('file', await compressImageForUpload(file));
      return (
        await api.post<{ data: { url: string; fileName: string } }>('/uploads/materials', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      ).data.data;
    },
  });

export const useReportPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      obligationId: string;
      amount: number;
      method: ReportMethod;
      operationNumber: string;
      paidOn: string;
      voucherFileUrl: string;
      note?: string;
    }) => (await api.post('/payment-reports', input)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: paymentReportsKeys.all });
      qc.invalidateQueries({ queryKey: paymentsKeys.parentObligations.all });
    },
  });
};

export const useReviewReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: 'approve' | 'reject'; reason?: string }) =>
      (
        await api.post<{ data: { receiptNumber?: string | null } }>(
          `/payment-reports/${id}/${action}`,
          action === 'reject' ? { reason } : {},
        )
      ).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: paymentReportsKeys.all });
      qc.invalidateQueries({ queryKey: paymentsKeys.obligations.all });
      qc.invalidateQueries({ queryKey: paymentsKeys.summary.all });
    },
  });
};
