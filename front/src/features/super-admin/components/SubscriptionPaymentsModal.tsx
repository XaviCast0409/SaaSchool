import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Wallet, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  useCreateSubscriptionPayment,
  useRenewalPreview,
  useSubscriptionPayments,
  useVoidSubscriptionPayment,
} from '../api/useSuperAdmin';
import type { SchoolWithStats, SubscriptionPayment } from '../types';
import { formatPeruShortDate, getPeruToday } from '@/lib/dateUtils';
import { formatMoney } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/errors';
import {
  SubscriptionPaymentForm,
  type PaymentFormValues,
} from './subscription-payments-modal/SubscriptionPaymentForm';
import { SubscriptionPaymentsTable } from './subscription-payments-modal/SubscriptionPaymentsTable';

interface SubscriptionPaymentsModalProps {
  school: SchoolWithStats | null;
  isOpen: boolean;
  onClose: () => void;
}

/** Registro de pagos de la suscripción de un colegio: cada pago extiende la vigencia del plan */
export const SubscriptionPaymentsModal: React.FC<SubscriptionPaymentsModalProps> = ({ school, isOpen, onClose }) => {
  const monthlyFee = school?.effectiveMonthlyFee ?? 0;
  const { register, handleSubmit, watch, setValue, reset, formState } = useForm<PaymentFormValues>({
    defaultValues: {
      amount: monthlyFee ? String(monthlyFee) : '',
      paidOn: getPeruToday(),
      method: 'TRANSFER',
      monthsCovered: '1',
      reference: '',
      notes: '',
    },
  });

  const months = Number(watch('monthsCovered')) || 0;
  const { data: payments, isLoading } = useSubscriptionPayments(isOpen && school ? school.id : null);
  const { data: preview } = useRenewalPreview(isOpen && school ? school.id : null, months);
  const { mutate: createPayment, isPending } = useCreateSubscriptionPayment();
  const { mutate: voidPayment, isPending: isVoiding } = useVoidSubscriptionPayment();
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');

  if (!isOpen || !school) return null;

  const latestActiveId = payments?.find((p) => !p.voidedAt)?.id;

  const onMonthsChange = (value: string) => {
    const m = Number(value);
    if (monthlyFee && m >= 1 && !formState.dirtyFields.amount) {
      setValue('amount', String(Math.round(monthlyFee * m * 100) / 100));
    }
  };

  const onSubmit = (values: PaymentFormValues) => {
    createPayment(
      {
        schoolId: school.id,
        payload: {
          amount: Number(values.amount),
          paidOn: values.paidOn,
          method: values.method,
          monthsCovered: Number(values.monthsCovered),
          reference: values.reference.trim() || null,
          notes: values.notes.trim() || null,
        },
      },
      {
        onSuccess: (payment) => {
          toast.success(
            `Pago registrado. "${school.name}" queda vigente hasta el ${formatPeruShortDate(payment.newExpiresAt)}.`,
          );
          reset({ ...values, reference: '', notes: '', paidOn: getPeruToday() });
        },
        onError: (err) => toast.error(getApiErrorMessage(err, 'No se pudo registrar el pago.')),
      },
    );
  };

  const confirmVoid = (payment: SubscriptionPayment) => {
    voidPayment(
      { schoolId: school.id, paymentId: payment.id, reason: voidReason },
      {
        onSuccess: ({ expiryReverted }) => {
          toast.success(
            expiryReverted
              ? `Pago anulado. La vigencia volvió a ${payment.previousExpiresAt ? formatPeruShortDate(payment.previousExpiresAt) : 'mensual indefinido'}.`
              : 'Pago anulado. La vigencia no se tocó porque fue modificada después del pago.',
          );
          setVoidingId(null);
          setVoidReason('');
        },
        onError: (err) => toast.error(getApiErrorMessage(err, 'No se pudo anular el pago.')),
      },
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Wallet className="w-5 h-5 text-primary shrink-0" />
            <div className="min-w-0">
              <h2 className="font-bold text-base text-foreground leading-none">Cobros de suscripción</h2>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {school.name} · Plan {school.plan} · {formatMoney(monthlyFee)}/mes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto">
          <SubscriptionPaymentForm
            register={register}
            errors={formState.errors}
            onSubmit={handleSubmit(onSubmit)}
            onMonthsChange={onMonthsChange}
            preview={preview}
            isPending={isPending}
          />

          <SubscriptionPaymentsTable
            isLoading={isLoading}
            payments={payments}
            latestActiveId={latestActiveId}
            voidingId={voidingId}
            voidReason={voidReason}
            isVoiding={isVoiding}
            onStartVoid={(id) => {
              setVoidingId(id);
              setVoidReason('');
            }}
            onCancelVoid={() => setVoidingId(null)}
            onVoidReasonChange={setVoidReason}
            onConfirmVoid={confirmVoid}
          />
        </div>
      </div>
    </div>
  );
};
