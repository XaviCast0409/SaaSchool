import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPeruShortDate, getPeruToday } from '@/lib/dateUtils';
import { formatMoney } from '@/lib/format';
import { useCashiers } from '../../api/useCash';
import { useCollectionsReport, type GroupRow } from '../../api/useFinance';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  methodLabel,
  personName,
} from '../../types';
import { exportFinanceExcel, type ExcelSheet } from '../../utils/financeExcel';
import { CONCEPTS, sel, monthStart, studentName } from './constants';
import { useSchoolName } from './useSchoolName';
import { ExcelButton, DateRange, GroupTable } from './FinanceReportsUI';

export const CollectionsTab: React.FC = () => {
  const schoolName = useSchoolName();
  const [f, setF] = useState({
    startDate: monthStart(),
    endDate: getPeruToday(),
    cashierId: '',
    method: '',
    concept: '',
  });
  const { data: cashiers = [] } = useCashiers();
  const { data, isLoading } = useCollectionsReport(f);
  const subtitle = `${formatPeruShortDate(f.startDate)} al ${formatPeruShortDate(f.endDate)}`;

  const exportExcel = () => {
    if (!data) return;
    const group = (
      name: string,
      title: string,
      rows: GroupRow[],
      label?: (k: string) => string,
    ): ExcelSheet<GroupRow> => ({
      name,
      title,
      subtitle,
      columns: [
        { header: 'Grupo', width: 30, value: (r) => (label ? label(r.key) : r.key) },
        { header: 'Cobros', type: 'number', total: true, value: (r) => r.count },
        { header: 'Monto', type: 'money', total: true, value: (r) => r.total },
      ],
      rows,
    });
    void exportFinanceExcel(`ingresos-${f.startDate}-a-${f.endDate}`, schoolName, [
      {
        name: 'Detalle',
        title: 'Ingresos (cobros vigentes)',
        subtitle,
        columns: [
          { header: 'Fecha y hora', type: 'datetime', width: 17, value: (r) => r.paymentDate },
          { header: 'Recibo', width: 12, value: (r) => r.receiptNumber },
          { header: 'Alumno', width: 32, value: (r) => studentName(r.obligation.enrollment.student) },
          { header: 'DNI', width: 11, value: (r) => r.obligation.enrollment.student.documentId },
          {
            header: 'Aula',
            width: 8,
            value: (r) => `${r.obligation.enrollment.classroom.grade}° ${r.obligation.enrollment.classroom.section}`,
          },
          { header: 'Cuota', width: 26, value: (r) => r.obligation.title },
          { header: 'Concepto', width: 16, value: (r) => CONCEPTS[r.obligation.concept] ?? r.obligation.concept },
          { header: 'Medio', width: 13, value: (r) => methodLabel(r.paymentMethod) },
          { header: 'N° operación', width: 16, value: (r) => r.operationNumber },
          {
            header: 'Cobró',
            width: 20,
            value: (r) => (r.collectedBy ? personName(r.collectedBy) : 'Voucher validado'),
          },
          { header: 'Monto', type: 'money', total: true, value: (r) => r.amountPaid },
        ],
        rows: data.rows,
      } as ExcelSheet<(typeof data.rows)[number]>,
      group('Por día', 'Ingresos por día', data.byDay, (k) => formatPeruShortDate(k)),
      group('Por medio', 'Ingresos por medio de pago', data.byMethod, methodLabel),
      group('Por concepto', 'Ingresos por concepto', data.byConcept, (k) => CONCEPTS[k] ?? k),
      group('Por cajero', 'Ingresos por cajero', data.byCashier),
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <DateRange start={f.startDate} end={f.endDate} onChange={(s, e) => setF({ ...f, startDate: s, endDate: e })} />
        <label className="space-y-1 text-xs font-semibold text-muted-foreground">
          Cajero
          <select
            className={`${sel} block`}
            value={f.cashierId}
            onChange={(e) => setF({ ...f, cashierId: e.target.value })}
          >
            <option value="">Todos</option>
            {cashiers.map((c) => (
              <option key={c.id} value={c.id}>
                {personName(c)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold text-muted-foreground">
          Medio
          <select className={`${sel} block`} value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>
            <option value="">Todos</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABEL[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold text-muted-foreground">
          Concepto
          <select
            className={`${sel} block`}
            value={f.concept}
            onChange={(e) => setF({ ...f, concept: e.target.value })}
          >
            <option value="">Todos</option>
            {Object.entries(CONCEPTS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto">
          <ExcelButton onClick={exportExcel} disabled={!data} />
        </div>
      </div>
      {isLoading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-3">
              <p className="text-xs font-bold uppercase text-primary">Total ingresado</p>
              <p className="text-xl font-black">{formatMoney(data.total)}</p>
              <p className="text-xs text-muted-foreground">{data.count} cobros vigentes</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs font-bold uppercase text-muted-foreground">Recibos anulados</p>
              <p className="text-xl font-black">{data.voided.count}</p>
              <p className="text-xs text-muted-foreground">{formatMoney(data.voided.total)} (no suman)</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs font-bold uppercase text-muted-foreground">Promedio por cobro</p>
              <p className="text-xl font-black">{formatMoney(data.count ? data.total / data.count : 0)}</p>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <GroupTable title="Por medio de pago" rows={data.byMethod} label={methodLabel} total={data.total} />
            <GroupTable title="Por cajero" rows={data.byCashier} total={data.total} />
            <GroupTable title="Por concepto" rows={data.byConcept} label={(k) => CONCEPTS[k] ?? k} total={data.total} />
          </div>
          <GroupTable title="Por día" rows={data.byDay} label={(k) => formatPeruShortDate(k)} total={data.total} />
        </>
      )}
    </div>
  );
};
