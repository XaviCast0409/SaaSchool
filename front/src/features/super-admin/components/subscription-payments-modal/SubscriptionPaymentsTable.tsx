import React from 'react';
import { Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPeruShortDate } from '@/lib/dateUtils';
import { formatMoney } from '@/lib/format';
import { PAYMENT_METHOD_LABELS, type SubscriptionPayment } from '../../types';

interface SubscriptionPaymentsTableProps {
  isLoading: boolean;
  payments: SubscriptionPayment[] | undefined;
  latestActiveId: string | undefined;
  voidingId: string | null;
  voidReason: string;
  isVoiding: boolean;
  onStartVoid: (paymentId: string) => void;
  onCancelVoid: () => void;
  onVoidReasonChange: (reason: string) => void;
  onConfirmVoid: (payment: SubscriptionPayment) => void;
}

export const SubscriptionPaymentsTable: React.FC<SubscriptionPaymentsTableProps> = ({
  isLoading,
  payments,
  latestActiveId,
  voidingId,
  voidReason,
  isVoiding,
  onStartVoid,
  onCancelVoid,
  onVoidReasonChange,
  onConfirmVoid,
}) => {
  return (
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
                    {formatMoney(p.amount)}
                  </strong>
                  <span className="text-muted-foreground">
                    {formatPeruShortDate(p.paidOn)} · {PAYMENT_METHOD_LABELS[p.method]}
                    {p.reference ? ` · ${p.reference}` : ''}
                  </span>
                  {p.voidedAt && (
                    <Badge variant="destructive" className="text-xs">
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
                    onClick={() => onStartVoid(p.id)}
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
                    onChange={(e) => onVoidReasonChange(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <div className="flex gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={onCancelVoid}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="h-8 text-xs"
                      disabled={voidReason.trim().length < 3}
                      isLoading={isVoiding}
                      onClick={() => onConfirmVoid(p)}
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
  );
};
