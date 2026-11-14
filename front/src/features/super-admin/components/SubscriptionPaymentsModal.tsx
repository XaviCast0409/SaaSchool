import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Wallet, X, Save, Ban, CalendarCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  useCreateSubscriptionPayment,
  useRenewalPreview,
  useSubscriptionPayments,
  useVoidSubscriptionPayment,
} from '../api/useSuperAdmin';
import {
  PAYMENT_METHOD_LABELS,
  SchoolWithStats,
  SubscriptionPayment,
  SubscriptionPaymentMethod,
} from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPeruShortDate, getPeruToday } from '@/lib/dateUtils';

interface SubscriptionPaymentsModalProps {
  school: SchoolWithStats | null;
  isOpen: boolean;
  onClose: () => void;
}

interface PaymentFormValues {
  amount: string;
  paidOn: string;
  method: SubscriptionPaymentMethod;
  monthsCovered: string;
  reference: string;
  notes: string;
}

const formatSoles = (n: number) =>
  `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const errorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

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
    // Sugerir el monto según la mensualidad pactada mientras no lo hayan editado a mano
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
          toast.success(`Pago registrado. "${school.name}" queda vigente hasta el ${formatPeruShortDate(payment.newExpiresAt)}.`);
          reset({ ...values, reference: '', notes: '', paidOn: getPeruToday() });
        },
        onError: (err) => toast.error(errorMessage(err, 'No se pudo registrar el pago.')),
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
        onError: (err) => toast.error(errorMessage(err, 'No se pudo anular el pago.')),
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Wallet className="w-5 h-5 text-primary shrink-0" />
            <div className="min-w-0">
              <h2 className="font-bold text-base text-foreground leading-none">Cobros de suscripción</h2>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {school.name} · Plan {school.plan} · {formatSoles(monthlyFee)}/mes
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
          {/* Registrar pago */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 border-b border-border">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-foreground">Meses que paga</label>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  {...register('monthsCovered', {
                    required: true,
                    validate: (v) => (Number(v) >= 1 && Number(v) <= 24) || 'Entre 1 y 24 meses',
                    onChange: (e) => onMonthsChange(e.target.value),
                  })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-foreground">Monto (S/)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...register('amount', {
                    required: 'Ingresa el monto',
                    validate: (v) => Number(v) > 0 || 'El monto debe ser mayor a 0',
                  })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-foreground">Fecha de pago</label>
                <Input type="date" max={getPeruToday()} {...register('paidOn', { required: true })} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-foreground">Medio</label>
                <select
                  {...register('method')}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wide text-foreground">N.° de operación / comprobante</label>
                <Input placeholder="Opcional" maxLength={120} {...register('reference')} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <label className="text-xs font-bold uppercase tracking-wide text-foreground">Notas</label>
                <Input placeholder="Opcional" maxLength={1000} {...register('notes')} className="h-9 text-xs" />
              </div>
            </div>

            {(formState.errors.amount || formState.errors.monthsCovered) && (
              <p className="text-xs text-destructive">
                {formState.errors.amount?.message || formState.errors.monthsCovered?.message}
              </p>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <CalendarCheck className="w-4 h-4 text-primary shrink-0 mt-px" />
                {preview ? (
                  <span>
                    Vigente hoy hasta{' '}
                    <strong className="text-foreground">
                      {preview.currentExpiresAt ? formatPeruShortDate(preview.currentExpiresAt) : 'sin fecha (indefinido)'}
                    </strong>
                    . Con este pago queda hasta{' '}
                    <strong className="text-foreground">{formatPeruShortDate(preview.newExpiresAt)}</strong>.
                  </span>
                ) : (
                  <span>Calculando nueva vigencia…</span>
                )}
              </div>
              <Button type="submit" size="sm" isLoading={isPending} className="gap-2 font-bold shrink-0">
                <Save className="w-4 h-4" />
                Registrar pago
              </Button>
            </div>
          </form>

          {/* Historial */}
          <div className="p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Historial de pagos</h3>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : !payments?.length ? (
              <p className="text-xs text-muted-foreground">Todavía no hay pagos registrados para este colegio.</p>
            ) : (
              <ul className="space-y-2">
                {payments.map((p) => (
                  <li
                    key={p.id}
                    className={`rounded-xl border border-border p-3 text-xs ${p.voidedAt ? 'opacity-60' : ''}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className={`text-sm text-foreground ${p.voidedAt ? 'line-through' : ''}`}>
                          {formatSoles(p.amount)}
                        </strong>
                        <span className="text-muted-foreground">
                          {formatPeruShortDate(p.paidOn)} · {PAYMENT_METHOD_LABELS[p.method]}
                          {p.reference ? ` · ${p.reference}` : ''}
                        </span>
                        {p.voidedAt && (
                          <Badge variant="destructive" className="text-[10px]">
                            Anulado
                          </Badge>
                        )}
                      </div>
                      {p.id === latestActiveId && voidingId !== p.id && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setVoidingId(p.id);
                            setVoidReason('');
                          }}
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Anular
                        </Button>
                      )}
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      {p.monthsCovered} {p.monthsCovered === 1 ? 'mes' : 'meses'} del plan {p.plan} · vigencia{' '}
                      {p.previousExpiresAt ? formatPeruShortDate(p.previousExpiresAt) : 'indefinida'} →{' '}
                      {formatPeruShortDate(p.newExpiresAt)}
                      {p.createdByEmail ? ` · registró ${p.createdByEmail}` : ''}
                    </div>
                    {p.notes && <div className="mt-1 text-muted-foreground">{p.notes}</div>}
                    {p.voidedAt && (
                      <div className="mt-1 text-destructive">
                        Anulado el {formatPeruShortDate(p.voidedAt)}
                        {p.voidedByEmail ? ` por ${p.voidedByEmail}` : ''}: {p.voidReason}
                      </div>
                    )}
                    {voidingId === p.id && (
                      <div className="mt-2 flex flex-col sm:flex-row gap-2">
                        <Input
                          autoFocus
                          placeholder="Motivo de la anulación (p. ej. monto mal digitado)"
                          value={voidReason}
                          onChange={(e) => setVoidReason(e.target.value)}
                          className="h-8 text-xs"
                        />
                        <div className="flex gap-2 shrink-0">
                          <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setVoidingId(null)}>
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="h-8 text-xs"
                            disabled={voidReason.trim().length < 3}
                            isLoading={isVoiding}
                            onClick={() => confirmVoid(p)}
                          >
                            Confirmar anulación
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
