import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ban } from 'lucide-react';
import { formatPeruTime } from '@/lib/dateUtils';
import {
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_DOCUMENT_LABEL,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  methodLabel,
  personName,
  type CashExpense,
  type DailyCashCloseData,
  type PaymentMethod,
} from '../types';

const soles = (n: number | null | undefined) => `S/ ${Number(n ?? 0).toFixed(2)}`;
export { soles };

/** Tarjetas con el total por medio de pago (solo cobros vigentes). */
export const MethodTotals: React.FC<{
  byMethod: Record<PaymentMethod, number>;
  countByMethod?: Record<PaymentMethod, number>;
}> = ({ byMethod, countByMethod }) => (
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
    {PAYMENT_METHODS.map((m) => (
      <div key={m} className="rounded-lg border border-border bg-card p-2.5">
        <p className="text-[11px] font-semibold uppercase text-muted-foreground">{PAYMENT_METHOD_LABEL[m]}</p>
        <p className="text-sm font-bold text-foreground">{soles(byMethod?.[m])}</p>
        {countByMethod && <p className="text-[10px] text-muted-foreground">{countByMethod[m] ?? 0} cobros</p>}
      </div>
    ))}
  </div>
);

type Tx = DailyCashCloseData['transactions'][number];

/** Lista de cobros: los anulados se ven tachados con su motivo (nunca desaparecen). */
export const PaymentsList: React.FC<{
  transactions: Tx[];
  showCashier?: boolean;
  onOpenReceipt?: (id: string) => void;
}> = ({ transactions, showCashier, onOpenReceipt }) => {
  if (transactions.length === 0) {
    return <p className="py-6 text-center text-xs text-muted-foreground">No hay cobros registrados.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
          <tr>
            <th className="p-2">Hora</th>
            <th className="p-2">Recibo</th>
            <th className="p-2">Alumno / Concepto</th>
            <th className="p-2">Medio</th>
            {showCashier && <th className="p-2">Cobró</th>}
            <th className="p-2 text-right">Monto</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const voided = t.status === 'VOIDED';
            const st = t.obligation?.enrollment?.student;
            return (
              <tr key={t.id} className={`border-t border-border align-top ${voided ? 'bg-destructive/5 text-muted-foreground' : ''}`}>
                <td className="p-2 whitespace-nowrap">{formatPeruTime(t.paymentDate)}</td>
                <td className="p-2 font-mono whitespace-nowrap">
                  {onOpenReceipt ? (
                    <button type="button" className={`text-primary hover:underline ${voided ? 'line-through' : ''}`} onClick={() => onOpenReceipt(t.id)}>
                      {t.receiptNumber ?? '—'}
                    </button>
                  ) : (
                    <span className={voided ? 'line-through' : ''}>{t.receiptNumber ?? '—'}</span>
                  )}
                  {voided && <Badge variant="destructive" className="ml-1 text-[10px]">Anulado</Badge>}
                </td>
                <td className="p-2">
                  <span className="font-medium text-foreground">
                    {st ? `${st.lastNamePaternal} ${st.lastNameMaternal ?? ''}, ${st.firstNames}` : '—'}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">{t.obligation?.title}</span>
                  {voided && <span className="block text-[11px] text-destructive">Motivo: {t.voidReason}</span>}
                </td>
                <td className="p-2 whitespace-nowrap">
                  {methodLabel(t.paymentMethod)}
                  {t.operationNumber && <span className="block font-mono text-[10px] text-muted-foreground">Op. {t.operationNumber}</span>}
                </td>
                {showCashier && <td className="p-2 whitespace-nowrap">{personName(t.collectedBy)}</td>}
                <td className={`p-2 text-right font-semibold whitespace-nowrap ${voided ? 'line-through' : ''}`}>{soles(t.amountPaid)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

/** Lista de egresos de caja chica (los anulados se ven tachados con su motivo). */
export const ExpensesList: React.FC<{
  expenses: CashExpense[];
  onVoid?: (expense: CashExpense) => void;
}> = ({ expenses, onVoid }) => {
  if (expenses.length === 0) {
    return <p className="py-6 text-center text-xs text-muted-foreground">No hay egresos registrados.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
          <tr>
            <th className="p-2">N°</th>
            <th className="p-2">Hora</th>
            <th className="p-2">Detalle</th>
            <th className="p-2">Comprobante</th>
            <th className="p-2">Registró</th>
            <th className="p-2 text-right">Monto</th>
            {onVoid && <th className="p-2" />}
          </tr>
        </thead>
        <tbody>
          {expenses.map((e) => {
            const voided = e.status === 'VOIDED';
            return (
              <tr key={e.id} className={`border-t border-border align-top ${voided ? 'bg-destructive/5 text-muted-foreground' : ''}`}>
                <td className="p-2 font-mono whitespace-nowrap">
                  <span className={voided ? 'line-through' : ''}>{e.expenseNumber}</span>
                  {voided && <Badge variant="destructive" className="ml-1 text-[10px]">Anulado</Badge>}
                </td>
                <td className="p-2 whitespace-nowrap">{formatPeruTime(e.createdAt)}</td>
                <td className="p-2">
                  <span className="font-medium text-foreground">{e.description}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {EXPENSE_CATEGORY_LABEL[e.category] ?? e.category}
                    {e.beneficiary ? ` · ${e.beneficiary}` : ''}
                  </span>
                  {voided && <span className="block text-[11px] text-destructive">Motivo: {e.voidReason}</span>}
                </td>
                <td className="p-2 whitespace-nowrap">
                  {e.documentType ? EXPENSE_DOCUMENT_LABEL[e.documentType] ?? e.documentType : '—'}
                  {e.documentNumber && <span className="block font-mono text-[10px]">{e.documentNumber}</span>}
                </td>
                <td className="p-2 whitespace-nowrap">{personName(e.registeredBy)}</td>
                <td className={`p-2 text-right font-semibold whitespace-nowrap ${voided ? 'line-through' : ''}`}>{soles(e.amount)}</td>
                {onVoid && (
                  <td className="p-2">
                    {!voided && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" title="Anular egreso" onClick={() => onVoid(e)}>
                        <Ban className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
