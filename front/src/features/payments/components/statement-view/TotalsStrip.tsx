import React from 'react';
import { formatMoney } from '@/lib/format';
import type { StatementTotals } from '../../api/useFinance';

export const TotalsStrip: React.FC<{ t: StatementTotals }> = ({ t }) => (
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
    {[
      ['Monto original', t.original],
      ['Descuentos y becas', -t.discounts],
      ['Moras', t.lateFees],
      ['Pagado', t.paid],
      ['Saldo', t.balance],
      ['Vencido', t.overdue],
    ].map(([label, v]) => (
      <div key={label as string} className="rounded-lg border border-border p-2">
        <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
        <p className={`text-sm font-bold ${label === 'Vencido' && Number(v) > 0 ? 'text-destructive' : ''}`}>
          {formatMoney(v as number)}
        </p>
      </div>
    ))}
  </div>
);
