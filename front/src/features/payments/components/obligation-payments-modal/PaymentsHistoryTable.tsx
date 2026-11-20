import React from 'react';
import { Ban, FileText, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPeruDateTime } from '@/lib/dateUtils';
import { formatMoney } from '@/lib/format';
import { methodLabel, personName, type PaymentTransaction } from '../../types';

interface PaymentsHistoryTableProps {
  transactions: PaymentTransaction[];
  canManage: boolean;
  onViewReceipt: (id: string) => void;
  onVoidTransaction: (t: PaymentTransaction) => void;
}

export const PaymentsHistoryTable: React.FC<PaymentsHistoryTableProps> = ({
  transactions,
  canManage,
  onViewReceipt,
  onVoidTransaction,
}) => {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
        <History className="h-6 w-6" />
        Esta cuota todavía no tiene cobros.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-2">Recibo</th>
            <th className="p-2">Fecha</th>
            <th className="p-2">Medio</th>
            <th className="p-2">Cobró</th>
            <th className="p-2 text-right">Monto</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const isVoided = t.status === 'VOIDED';
            return (
              <React.Fragment key={t.id}>
                <tr
                  className={`border-t border-border ${isVoided ? 'bg-destructive/5 text-muted-foreground' : ''}`}
                >
                  <td className="p-2 font-mono">
                    <span className={isVoided ? 'line-through' : ''}>{t.receiptNumber ?? '—'}</span>
                    {isVoided && (
                      <Badge variant="destructive" className="ml-1.5 text-xs">
                        Anulado
                      </Badge>
                    )}
                  </td>
                  <td className="p-2">{formatPeruDateTime(t.paymentDate)}</td>
                  <td className="p-2">
                    {methodLabel(t.paymentMethod)}
                    {t.operationNumber && (
                      <span className="block font-mono text-xs text-muted-foreground">
                        Op. {t.operationNumber}
                      </span>
                    )}
                  </td>
                  <td className="p-2">{personName(t.collectedBy)}</td>
                  <td className={`p-2 text-right font-semibold ${isVoided ? 'line-through' : ''}`}>
                    {formatMoney(Number(t.amountPaid))}
                  </td>
                  <td className="p-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        title="Ver recibo"
                        onClick={() => onViewReceipt(t.id)}
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                      {canManage && !isVoided && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-destructive"
                          title="Anular cobro"
                          onClick={() => onVoidTransaction(t)}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
                {isVoided && (
                  <tr className="bg-destructive/5 text-xs text-muted-foreground">
                    <td colSpan={6} className="px-2 pb-2">
                      Anulado {t.voidedAt ? formatPeruDateTime(t.voidedAt) : ''} por {personName(t.voidedBy)}{' '}
                      — Motivo: {t.voidReason}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
