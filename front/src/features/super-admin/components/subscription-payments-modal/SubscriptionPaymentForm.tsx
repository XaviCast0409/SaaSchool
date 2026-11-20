import React from 'react';
import { CalendarCheck, Save } from 'lucide-react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPeruShortDate, getPeruToday } from '@/lib/dateUtils';
import { PAYMENT_METHOD_LABELS, type SubscriptionPaymentMethod } from '../../types';

export interface PaymentFormValues {
  amount: string;
  paidOn: string;
  method: SubscriptionPaymentMethod;
  monthsCovered: string;
  reference: string;
  notes: string;
}

interface SubscriptionPaymentFormProps {
  register: UseFormRegister<PaymentFormValues>;
  errors: FieldErrors<PaymentFormValues>;
  onSubmit: (e: React.FormEvent) => void;
  onMonthsChange: (value: string) => void;
  preview: { currentExpiresAt: string | null; newExpiresAt: string } | undefined;
  isPending: boolean;
}

export const SubscriptionPaymentForm: React.FC<SubscriptionPaymentFormProps> = ({
  register,
  errors,
  onSubmit,
  onMonthsChange,
  preview,
  isPending,
}) => {
  return (
    <form onSubmit={onSubmit} className="p-5 space-y-4 border-b border-border">
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
          <Input
            type="date"
            max={getPeruToday()}
            {...register('paidOn', { required: true })}
            className="h-9 text-xs"
          />
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
          <label className="text-xs font-bold uppercase tracking-wide text-foreground">
            N.° de operación / comprobante
          </label>
          <Input placeholder="Opcional" maxLength={120} {...register('reference')} className="h-9 text-xs" />
        </div>
        <div className="space-y-1.5 sm:col-span-3">
          <label className="text-xs font-bold uppercase tracking-wide text-foreground">Notas</label>
          <Input placeholder="Opcional" maxLength={1000} {...register('notes')} className="h-9 text-xs" />
        </div>
      </div>

      {(errors.amount || errors.monthsCovered) && (
        <p className="text-xs text-destructive">
          {errors.amount?.message || errors.monthsCovered?.message}
        </p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <CalendarCheck className="w-4 h-4 text-primary shrink-0 mt-px" />
          {preview ? (
            <span>
              Vigente hoy hasta{' '}
              <strong className="text-foreground">
                {preview.currentExpiresAt
                  ? formatPeruShortDate(preview.currentExpiresAt)
                  : 'sin fecha (indefinido)'}
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
  );
};
