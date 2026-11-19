import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPeruShortDate, getPeruToday } from '@/lib/dateUtils';
import { formatMoney } from '@/lib/format';
import { paymentsKeys } from '../../api/keys';
import {
  EXPENSE_CATEGORY_LABEL,
  personName,
  type CashExpense,
} from '../../types';
import { ExpensesList } from '../CashMovements';
import { exportFinanceExcel, type ExcelSheet } from '../../utils/financeExcel';
import { monthStart } from './constants';
import { useSchoolName } from './useSchoolName';
import { ExcelButton, DateRange } from './FinanceReportsUI';

export const ExpensesTab: React.FC = () => {
  const schoolName = useSchoolName();
  const [r, setR] = useState({ startDate: monthStart(), endDate: getPeruToday() });
  const { data = [], isLoading } = useQuery({
    queryKey: paymentsKeys.report.expenses(r),
    queryFn: async () => (await api.get<{ data: CashExpense[] }>('/payments/cash/expenses', { params: r })).data.data,
  });
  const active = data.filter((e) => e.status === 'ACTIVE');
  const total = active.reduce((s, e) => s + Number(e.amount), 0);
  const byCategory = Object.entries(
    active.reduce<Record<string, number>>(
      (acc, e) => ({ ...acc, [e.category]: (acc[e.category] ?? 0) + Number(e.amount) }),
      {},
    ),
  ).sort((a, b) => b[1] - a[1]);

  const exportExcel = () =>
    void exportFinanceExcel(`egresos-${r.startDate}-a-${r.endDate}`, schoolName, [
      {
        name: 'Egresos',
        title: 'Egresos de caja chica',
        subtitle: `${formatPeruShortDate(r.startDate)} al ${formatPeruShortDate(r.endDate)}`,
        columns: [
          { header: 'N°', width: 11, value: (e) => e.expenseNumber },
          { header: 'Fecha', type: 'datetime', width: 16, value: (e) => e.createdAt },
          { header: 'Categoría', width: 24, value: (e) => EXPENSE_CATEGORY_LABEL[e.category] ?? e.category },
          { header: 'Descripción', width: 36, value: (e) => e.description },
          { header: 'Pagado a', width: 22, value: (e) => e.beneficiary },
          { header: 'Comprobante', width: 14, value: (e) => e.documentType },
          { header: 'N° comprobante', width: 15, value: (e) => e.documentNumber },
          { header: 'Caja de', width: 18, value: (e) => personName(e.cashSession?.cashier) },
          { header: 'Monto', type: 'money', total: true, value: (e) => (e.status === 'ACTIVE' ? Number(e.amount) : 0) },
          {
            header: 'Estado',
            width: 24,
            value: (e) => (e.status === 'ACTIVE' ? 'Vigente' : `Anulado: ${e.voidReason ?? ''}`),
          },
        ],
        rows: data,
      } as ExcelSheet<CashExpense>,
    ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <DateRange start={r.startDate} end={r.endDate} onChange={(s, e) => setR({ startDate: s, endDate: e })} />
        <div className="ml-auto">
          <ExcelButton onClick={exportExcel} disabled={data.length === 0} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs font-bold uppercase text-muted-foreground">Total egresos</p>
          <p className="text-xl font-black">{formatMoney(total)}</p>
          <p className="text-xs text-muted-foreground">{active.length} vigentes</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {byCategory.map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border px-3 py-2 text-xs">
              <p className="text-muted-foreground">{EXPENSE_CATEGORY_LABEL[k] ?? k}</p>
              <p className="font-bold">{formatMoney(v)}</p>
            </div>
          ))}
        </div>
      </div>
      {isLoading ? <Skeleton className="h-40 w-full" /> : <ExpensesList expenses={data} />}
    </div>
  );
};
