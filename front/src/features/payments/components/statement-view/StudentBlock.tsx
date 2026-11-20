import React from 'react';
import { Badge } from '@/components/ui/badge';
import { formatPeruShortDate } from '@/lib/dateUtils';
import { formatMoney } from '@/lib/format';
import { ADJUSTMENT_LABEL, type StudentStatement } from '../../api/useFinance';
import { methodLabel } from '../../types';

export const STATEMENT_STATUS: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'secondary' | 'outline' | 'destructive' }
> = {
  PAID: { label: 'Pagado', variant: 'success' },
  PENDING: { label: 'Pendiente', variant: 'warning' },
  PARTIAL: { label: 'Parcial', variant: 'secondary' },
  CANCELLED: { label: 'Anulada', variant: 'outline' },
};

export const StudentBlock: React.FC<{ st: StudentStatement; showVoided: boolean }> = ({ st, showVoided }) => (
  <section className="space-y-2 break-inside-avoid">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="text-sm font-bold">
        {st.student.fullName}{' '}
        <span className="text-xs font-normal text-muted-foreground">
          {st.student.classroom ?? ''} {st.student.documentId ? `· DNI ${st.student.documentId}` : ''}{' '}
          {st.student.year ? `· ${st.student.year}` : ''}
        </span>
      </h3>
    </div>
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted/40 text-left text-[10px] uppercase text-muted-foreground">
          <tr>
            <th className="p-1.5">Vence</th>
            <th className="p-1.5">Concepto</th>
            <th className="p-1.5 text-right">Original</th>
            <th className="p-1.5 text-right">Desc./beca</th>
            <th className="p-1.5 text-right">Mora</th>
            <th className="p-1.5 text-right">Neto</th>
            <th className="p-1.5 text-right">Pagado</th>
            <th className="p-1.5 text-right">Saldo</th>
            <th className="p-1.5">Estado</th>
          </tr>
        </thead>
        <tbody>
          {st.obligations.map((o) => {
            const details = [
              ...o.adjustments
                .filter((a) => showVoided || a.status === 'ACTIVE')
                .map((a) => ({
                  key: a.id,
                  voided: a.status === 'VOIDED',
                  text: `${a.number} · ${ADJUSTMENT_LABEL[a.type]}: ${a.reason}`,
                  amount: `${a.type === 'LATE_FEE' ? '+' : '−'} ${formatMoney(a.amount)}`,
                  note: a.voidReason,
                })),
              ...o.payments
                .filter((p) => showVoided || p.status === 'ACTIVE')
                .map((p) => ({
                  key: p.id,
                  voided: p.status === 'VOIDED',
                  text: `Recibo ${p.receiptNumber ?? '—'} · ${formatPeruShortDate(p.paymentDate)} · ${methodLabel(p.paymentMethod)}${p.operationNumber ? ` op. ${p.operationNumber}` : ''}`,
                  amount: formatMoney(p.amountPaid),
                  note: p.voidReason,
                })),
            ];
            return (
              <React.Fragment key={o.id}>
                <tr className={`border-t border-border ${o.status === 'CANCELLED' ? 'text-muted-foreground' : ''}`}>
                  <td className="p-1.5 whitespace-nowrap">{formatPeruShortDate(o.dueDate)}</td>
                  <td className="p-1.5">
                    {o.title}
                    {o.daysOverdue > 0 && (
                      <span className="ml-1 text-[10px] font-semibold text-destructive">
                        ({o.daysOverdue} días vencida)
                      </span>
                    )}
                    {o.status === 'CANCELLED' && o.cancelReason && (
                      <span className="block text-[10px]">Anulada: {o.cancelReason}</span>
                    )}
                  </td>
                  <td className="p-1.5 text-right">{formatMoney(o.original)}</td>
                  <td className="p-1.5 text-right">{o.discounts ? `− ${formatMoney(o.discounts)}` : '—'}</td>
                  <td className="p-1.5 text-right">{o.lateFees ? formatMoney(o.lateFees) : '—'}</td>
                  <td className="p-1.5 text-right font-semibold">{formatMoney(o.net)}</td>
                  <td className="p-1.5 text-right">{formatMoney(o.paid)}</td>
                  <td
                    className={`p-1.5 text-right font-semibold ${o.balance > 0 ? 'text-amber-700 dark:text-amber-400' : ''}`}
                  >
                    {formatMoney(o.balance)}
                  </td>
                  <td className="p-1.5">
                    <Badge variant={STATEMENT_STATUS[o.status].variant} className="text-[10px]">
                      {o.status === 'PAID' && o.net === 0 ? 'Exonerada' : STATEMENT_STATUS[o.status].label}
                    </Badge>
                  </td>
                </tr>
                {details.map((d) => (
                  <tr
                    key={d.key}
                    className={`text-[10px] ${d.voided ? 'text-muted-foreground line-through' : 'text-muted-foreground'}`}
                  >
                    <td />
                    <td className="px-1.5 pb-1" colSpan={6}>
                      ↳ {d.text}
                      {d.voided && <span className="no-underline"> — ANULADO{d.note ? `: ${d.note}` : ''}</span>}
                    </td>
                    <td className="px-1.5 pb-1 text-right">{d.amount}</td>
                    <td />
                  </tr>
                ))}
              </React.Fragment>
            );
          })}
          {st.obligations.length === 0 && (
            <tr>
              <td colSpan={9} className="p-4 text-center text-muted-foreground">
                Sin cuotas en el año escolar vigente.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot className="border-t-2 border-border bg-muted/30 font-semibold">
          <tr>
            <td className="p-1.5" colSpan={2}>
              Total del alumno
            </td>
            <td className="p-1.5 text-right">{formatMoney(st.totals.original)}</td>
            <td className="p-1.5 text-right">− {formatMoney(st.totals.discounts)}</td>
            <td className="p-1.5 text-right">{formatMoney(st.totals.lateFees)}</td>
            <td className="p-1.5 text-right">{formatMoney(st.totals.net)}</td>
            <td className="p-1.5 text-right">{formatMoney(st.totals.paid)}</td>
            <td className="p-1.5 text-right">{formatMoney(st.totals.balance)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  </section>
);
