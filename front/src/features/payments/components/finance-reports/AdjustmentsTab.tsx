import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPeruDateTime, formatPeruShortDate, getPeruToday } from '@/lib/dateUtils';
import { formatMoney } from '@/lib/format';
import {
  ADJUSTMENT_LABEL,
  useAdjustments,
  type AdjustmentType,
} from '../../api/useFinance';
import { personName } from '../../types';
import { exportFinanceExcel, type ExcelSheet } from '../../utils/financeExcel';
import { sel, studentName } from './constants';
import { useSchoolName } from './useSchoolName';
import { ExcelButton, DateRange } from './FinanceReportsUI';

export const AdjustmentsTab: React.FC = () => {
  const schoolName = useSchoolName();
  const [f, setF] = useState<{ startDate: string; endDate: string; type: '' | AdjustmentType }>({
    startDate: `${getPeruToday().slice(0, 4)}-01-01`,
    endDate: getPeruToday(),
    type: '',
  });
  const { data = [], isLoading } = useAdjustments({
    startDate: f.startDate,
    endDate: f.endDate,
    type: f.type || undefined,
  });
  const active = data.filter((a) => a.status === 'ACTIVE');
  const sum = (t: AdjustmentType) => active.filter((a) => a.type === t).reduce((s, a) => s + Number(a.amount), 0);

  const exportExcel = () =>
    void exportFinanceExcel(`ajustes-${f.startDate}-a-${f.endDate}`, schoolName, [
      {
        name: 'Ajustes',
        title: 'Descuentos, becas, moras y notas de crédito',
        subtitle: `${formatPeruShortDate(f.startDate)} al ${formatPeruShortDate(f.endDate)}`,
        columns: [
          { header: 'N°', width: 11, value: (r) => r.number },
          { header: 'Fecha', type: 'datetime', width: 16, value: (r) => r.createdAt },
          { header: 'Tipo', width: 15, value: (r) => ADJUSTMENT_LABEL[r.type] },
          {
            header: 'Alumno',
            width: 30,
            value: (r) => (r.obligation ? studentName(r.obligation.enrollment.student) : ''),
          },
          { header: 'Cuota', width: 24, value: (r) => r.obligation?.title },
          { header: 'Motivo', width: 40, value: (r) => r.reason },
          { header: 'Registró', width: 18, value: (r) => personName(r.createdBy) },
          {
            header: 'Efecto en deuda',
            type: 'money',
            total: true,
            value: (r) => (r.status === 'ACTIVE' ? (r.type === 'LATE_FEE' ? 1 : -1) * Number(r.amount) : 0),
          },
          {
            header: 'Estado',
            width: 26,
            value: (r) =>
              r.status === 'ACTIVE' ? 'Vigente' : `Anulado por ${personName(r.voidedBy)}: ${r.voidReason ?? ''}`,
          },
        ],
        rows: data,
      } as ExcelSheet<(typeof data)[number]>,
    ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <DateRange start={f.startDate} end={f.endDate} onChange={(s, e) => setF({ ...f, startDate: s, endDate: e })} />
        <label className="space-y-1 text-xs font-semibold text-muted-foreground">
          Tipo
          <select
            className={`${sel} block`}
            value={f.type}
            onChange={(e) => setF({ ...f, type: e.target.value as '' | AdjustmentType })}
          >
            <option value="">Todos</option>
            {Object.entries(ADJUSTMENT_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto">
          <ExcelButton onClick={exportExcel} disabled={data.length === 0} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(['DISCOUNT', 'SCHOLARSHIP', 'CREDIT_NOTE', 'LATE_FEE'] as AdjustmentType[]).map((t) => (
          <div key={t} className="rounded-xl border border-border p-3">
            <p className="text-xs font-bold uppercase text-muted-foreground">{ADJUSTMENT_LABEL[t]}</p>
            <p className="text-lg font-black">{formatMoney(sum(t))}</p>
          </div>
        ))}
      </div>
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : data.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No hay ajustes en el rango elegido.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2">N°</th>
                <th className="p-2">Fecha</th>
                <th className="p-2">Tipo</th>
                <th className="p-2">Alumno / cuota</th>
                <th className="p-2">Motivo</th>
                <th className="p-2">Registró</th>
                <th className="p-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {data.map((a) => {
                const voided = a.status === 'VOIDED';
                return (
                  <tr
                    key={a.id}
                    className={`border-t border-border align-top ${voided ? 'bg-destructive/5 text-muted-foreground' : ''}`}
                  >
                    <td className="p-2 font-mono whitespace-nowrap">
                      <span className={voided ? 'line-through' : ''}>{a.number}</span>
                      {voided && (
                        <Badge variant="destructive" className="ml-1 text-xs">
                          Anulado
                        </Badge>
                      )}
                    </td>
                    <td className="p-2 whitespace-nowrap">{formatPeruDateTime(a.createdAt)}</td>
                    <td className="p-2">{ADJUSTMENT_LABEL[a.type]}</td>
                    <td className="p-2">
                      {a.obligation ? studentName(a.obligation.enrollment.student) : ''}
                      <span className="block text-xs text-muted-foreground">{a.obligation?.title}</span>
                    </td>
                    <td className="p-2">
                      {a.reason}
                      {voided && <span className="block text-xs text-destructive">Anulado: {a.voidReason}</span>}
                    </td>
                    <td className="p-2 whitespace-nowrap">{personName(a.createdBy)}</td>
                    <td className={`p-2 text-right font-semibold whitespace-nowrap ${voided ? 'line-through' : ''}`}>
                      {a.type === 'LATE_FEE' ? '+' : '−'} {formatMoney(a.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
