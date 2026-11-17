import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DollarSign, X, Check } from 'lucide-react';
import { registerTransactionSchema, type RegisterTransactionFormData } from '../schemas/payment.schema';
import { useRegisterTransaction } from '../api/usePayments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL, PaymentObligation } from '../types';
import { useCurrentCash } from '../api/useCash';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ReceiptModal } from './ReceiptModal';

interface RegisterTransactionModalProps {
  obligation: PaymentObligation;
  onClose: () => void;
}

export const RegisterTransactionModal: React.FC<RegisterTransactionModalProps> = ({
  obligation,
  onClose,
}) => {
  const { mutate: registerTransaction, isPending, error } = useRegisterTransaction();
  // Tras cobrar se muestra el recibo para imprimirlo o enviarlo, en vez de solo un aviso.
  const [receiptId, setReceiptId] = useState<string | null>(null);

  // Calcular saldo pendiente
  const alreadyPaid = obligation.transactions.reduce((sum, tx) => sum + tx.amountPaid, 0);
  const remainingBalance = Math.max(0, obligation.amountDue - alreadyPaid);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<RegisterTransactionFormData>({
    resolver: zodResolver(registerTransactionSchema),
    defaultValues: {
      obligationId: obligation.id,
      amountPaid: remainingBalance,
      paymentMethod: 'CASH',
    },
  });
  const method = watch('paymentMethod');
  const { data: cash } = useCurrentCash();
  const hasOpenCash = Boolean(cash?.session);

  const student = obligation.enrollment?.student;
  const studentName = student
    ? `${student.lastNamePaternal} ${student.lastNameMaternal}, ${student.firstNames}`
    : 'Estudiante';

  const onSubmit = (data: RegisterTransactionFormData) => {
    if (data.amountPaid > remainingBalance + 0.001) {
      setError('amountPaid', { type: 'manual', message: `No puedes cobrar más que el saldo pendiente (S/ ${remainingBalance.toFixed(2)}).` });
      return;
    }
    const payload = { ...data, operationNumber: data.paymentMethod === 'CASH' ? undefined : data.operationNumber };
    registerTransaction(payload, {
      onSuccess: (tx) => {
        toast.success(`Pago de S/ ${data.amountPaid.toFixed(2)} registrado para ${studentName}. Recibo ${tx.receiptNumber ?? ''}.`);
        if (tx?.id) setReceiptId(tx.id);
        else onClose();
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || 'Error al registrar el cobro.');
      },
    });
  };

  if (receiptId) return <ReceiptModal transactionId={receiptId} onClose={onClose} />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-label="Registrar cobro" className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-card shrink-0">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            <div>
              <h2 className="font-bold text-base text-foreground leading-none">
                Registrar Cobro Manual
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {obligation.title} — {studentName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount Summary Banner */}
        <div className="p-4 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground block font-medium">Saldo Pendiente:</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              S/ {remainingBalance.toFixed(2)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground block font-medium">Monto de esta cuota:</span>
            <span className="text-sm font-semibold text-foreground">
              S/ {obligation.amountDue.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Form */}
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
              {(error as { response?: { data?: { message?: string } } }).response?.data?.message ||
                'Error al registrar el cobro.'}
            </div>
          )}

          <input type="hidden" {...register('obligationId')} />

          {/* Monto a Cobrar */}
          <div className="space-y-1">
            <label htmlFor="registertransactionmodal-amountPaid" className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Monto a Cobrar (S/)
            </label>
            <Input id="registertransactionmodal-amountPaid"
              type="number"
              step="0.01"
              {...register('amountPaid')}
              className="h-9 font-semibold text-base"
            />
            {errors.amountPaid && (
              <p className="text-xs text-destructive">{errors.amountPaid.message}</p>
            )}
          </div>

          {/* Método de Pago */}
          <div className="space-y-1">
            <label htmlFor="registertransactionmodal-paymentMethod" className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Método de Pago
            </label>
            <select id="registertransactionmodal-paymentMethod"
              {...register('paymentMethod')}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABEL[m]}
                </option>
              ))}
            </select>
            {method === 'CASH' && !hasOpenCash && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Para cobrar en efectivo primero abre tu caja del día.{' '}
                <Link to="/payments/cash" className="font-semibold underline">
                  Ir a Mi caja
                </Link>
              </p>
            )}
            {hasOpenCash && (
              <p className="text-xs text-muted-foreground">El cobro entrará en tu caja abierta y quedará a tu nombre.</p>
            )}
          </div>

          {/* N° Operación */}
          {method !== 'CASH' && (
            <div className="space-y-1">
              <label htmlFor="registertransactionmodal-operationNumber" className="text-xs font-semibold uppercase tracking-wide text-foreground">
                N° de operación ({PAYMENT_METHOD_LABEL[method]})
              </label>
              <Input id="registertransactionmodal-operationNumber" placeholder="Ej: 09812345" {...register('operationNumber')} className="h-9 text-xs" />
              {errors.operationNumber && <p className="text-xs text-destructive">{errors.operationNumber.message}</p>}
            </div>
          )}

          {/* Observaciones */}
          <div className="space-y-1">
            <label htmlFor="registertransactionmodal-notes" className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Observación / Nota opcional
            </label>
            <Input id="registertransactionmodal-notes" placeholder="Ej: Pago realizado por el apoderado en caja central" {...register('notes')} className="h-9 text-xs" />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" isLoading={isPending} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Check className="w-4 h-4" />
              <span>Confirmar y Registrar Pago</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
