import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DollarSign, X, Check } from 'lucide-react';
import { registerTransactionSchema, type RegisterTransactionFormData } from '../schemas/payment.schema';
import { useRegisterTransaction } from '../api/usePayments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PaymentObligation } from '../types';
import { toast } from 'sonner';

interface RegisterTransactionModalProps {
  obligation: PaymentObligation;
  onClose: () => void;
}

export const RegisterTransactionModal: React.FC<RegisterTransactionModalProps> = ({
  obligation,
  onClose,
}) => {
  const { mutate: registerTransaction, isPending, error } = useRegisterTransaction();

  // Calcular saldo pendiente
  const alreadyPaid = obligation.transactions.reduce((sum, tx) => sum + tx.amountPaid, 0);
  const remainingBalance = Math.max(0, obligation.amountDue - alreadyPaid);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterTransactionFormData>({
    resolver: zodResolver(registerTransactionSchema),
    defaultValues: {
      obligationId: obligation.id,
      amountPaid: remainingBalance,
      paymentMethod: 'CASH',
      receiptType: 'BOLETA DE VENTA',
    },
  });

  const student = obligation.enrollment?.student;
  const studentName = student
    ? `${student.lastNamePaternal} ${student.lastNameMaternal}, ${student.firstNames}`
    : 'Estudiante';

  const onSubmit = (data: RegisterTransactionFormData) => {
    registerTransaction(data, {
      onSuccess: () => {
        toast.success(`💵 Pago de S/ ${data.amountPaid.toFixed(2)} registrado con éxito para ${studentName}.`);
        onClose();
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || 'Error al registrar el cobro.');
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
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
            <span className="text-xs text-muted-foreground block font-medium">Monto Total Deuda:</span>
            <span className="text-sm font-semibold text-foreground">
              S/ {obligation.amountDue.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
              {(error as { response?: { data?: { message?: string } } }).response?.data?.message ||
                'Error al registrar el cobro.'}
            </div>
          )}

          <input type="hidden" {...register('obligationId')} />

          {/* Monto a Cobrar */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Monto a Cobrar (S/)
            </label>
            <Input
              type="number"
              step="0.01"
              max={remainingBalance}
              {...register('amountPaid')}
              className="h-9 font-semibold text-base"
            />
            {errors.amountPaid && (
              <p className="text-xs text-destructive">{errors.amountPaid.message}</p>
            )}
          </div>

          {/* Método de Pago */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Método de Pago
            </label>
            <select
              {...register('paymentMethod')}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="CASH">Efectivo en Caja</option>
              <option value="BANK_TRANSFER">Depósito / Transferencia Bancaria</option>
              <option value="CREDIT_CARD">Tarjeta de Débito / Crédito</option>
            </select>
          </div>

          {/* N° Operación & Comprobante */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Tipo Comprobante
              </label>
              <select
                {...register('receiptType')}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="BOLETA DE VENTA">Boleta de Venta</option>
                <option value="FACTURA">Factura</option>
                <option value="RECIBO DE CAJA">Recibo Simple</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
                N° Operación / Transacción
              </label>
              <Input placeholder="Ej: 09812345" {...register('operationNumber')} className="h-9 text-xs" />
            </div>
          </div>

          {/* Observaciones */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Observación / Nota opcional
            </label>
            <Input placeholder="Ej: Pago realizado por el apoderado en caja central" {...register('notes')} className="h-9 text-xs" />
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
