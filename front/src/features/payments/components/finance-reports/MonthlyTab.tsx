import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { getPeruToday } from '@/lib/dateUtils';
import { formatMoney } from '@/lib/format';
import { useMonthlyReport } from '../../api/useFinance';
import { exportFinanceExcel, type ExcelSheet } from '../../utils/financeExcel';
import { MONTHS, sel } from './constants';
import { useSchoolName } from './useSchoolName';
import { ExcelButton } from './FinanceReportsUI';

export const MonthlyTab: React.FC = () => {
  const schoolName = useSchoolName();
  const thisYear = Number(getPeruToday().slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const { data, isLoading } = useMonthlyReport(year);
  const cols = [
    ['original', 'Emitido (original)'],
    ['discounts', 'Descuentos y becas'],
    ['lateFees', 'Moras'],
    ['net', 'Neto por cobrar'],
    ['paid', 'Cobrado'],
    ['balance', 'Pendiente'],
    ['cashIn', 'Ingresó en el mes'],
    ['expenses', 'Egresos caja chica'],
  ] as const;

  const exportExcel = () =>
    data &&
    void exportFinanceExcel(`resumen-mensual-${year}`, schoolName, [
      {
        name: `Resumen ${year}`,
        title: 'Resumen mensual',
        subtitle: `Año ${year} (emitido por mes de vencimiento; ingresos y egresos por fecha real)`,
        columns: [
          { header: 'Mes', width: 12, value: (r) => MONTHS[r.month - 1] },
          ...cols.map(([k, label]) => ({
            header: label,
            type: 'money' as const,
            total: true,
            width: 16,
            value: (r: (typeof data.months)[number]) => r[k],
          })),
        ],
        rows: data.months,
      } as ExcelSheet<(typeof data.months)[number]>,
    ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1 text-xs font-semibold text-muted-foreground">
          Año
          <select className={`${sel} block`} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[thisYear - 2, thisYear - 1, thisYear, thisYear + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted-foreground">
          Lo emitido se agrupa por mes de vencimiento; "Ingresó en el mes" y los egresos, por la fecha real del
          movimiento.
        </p>
        <div className="ml-auto">
          <ExcelButton onClick={exportExcel} disabled={!data} />
        </div>
      </div>
      {isLoading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2">Mes</th>
                {cols.map(([k, label]) => (
                  <th key={k} className="p-2 text-right">
                    {label}
                  </th>
                ))}
                <th className="p-2 text-right">% cobrado</th>
              </tr>
            </thead>
            <tbody>
              {data.months.map((m) => (
                <tr key={m.month} className="border-t border-border">
                  <td className="p-2 font-medium">{MONTHS[m.month - 1]}</td>
                  {cols.map(([k]) => (
                    <td key={k} className="p-2 text-right">
                      {m[k] ? formatMoney(m[k]) : '—'}
                    </td>
                  ))}
                  <td className="p-2 text-right">{m.net ? `${((m.paid / m.net) * 100).toFixed(1)} %` : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border bg-muted/30 font-semibold">
              <tr>
                <td className="p-2">Total {year}</td>
                {cols.map(([k]) => (
                  <td key={k} className="p-2 text-right">
                    {formatMoney(data.totals[k])}
                  </td>
                ))}
                <td className="p-2 text-right">
                  {data.totals.net ? `${((data.totals.paid / data.totals.net) * 100).toFixed(1)} %` : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
