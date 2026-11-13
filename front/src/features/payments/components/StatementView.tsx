import React from 'react';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPeruDateTime, formatPeruShortDate } from '@/lib/dateUtils';
import { PrintPortal, usePrint } from '@/lib/print';
import { useGetActiveSchool } from '@/features/schools/api/useSchool';
import { ADJUSTMENT_LABEL, type FamilyStatement, type StatementTotals, type StudentStatement } from '../api/useFinance';
import { methodLabel } from '../types';
import { soles } from './CashMovements';
import { exportFinanceExcel } from '../utils/financeExcel';

const STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' | 'outline' | 'destructive' }> = {
  PAID: { label: 'Pagado', variant: 'success' },
  PENDING: { label: 'Pendiente', variant: 'warning' },
  PARTIAL: { label: 'Parcial', variant: 'secondary' },
  CANCELLED: { label: 'Anulada', variant: 'outline' },
};

const TotalsStrip: React.FC<{ t: StatementTotals }> = ({ t }) => (
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
        <p className={`text-sm font-bold ${label === 'Vencido' && Number(v) > 0 ? 'text-destructive' : ''}`}>{soles(v as number)}</p>
      </div>
    ))}
  </div>
);

/** Detalle de un alumno: cuotas con ajustes y cobros (anulados tachados con motivo). */
const StudentBlock: React.FC<{ st: StudentStatement; showVoided: boolean }> = ({ st, showVoided }) => (
  <section className="space-y-2 break-inside-avoid">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="text-sm font-bold">
        {st.student.fullName}{' '}
        <span className="text-xs font-normal text-muted-foreground">
          {st.student.classroom ?? ''} {st.student.documentId ? `· DNI ${st.student.documentId}` : ''} {st.student.year ? `· ${st.student.year}` : ''}
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
              ...o.adjustments.filter((a) => showVoided || a.status === 'ACTIVE').map((a) => ({
                key: a.id,
                voided: a.status === 'VOIDED',
                text: `${a.number} · ${ADJUSTMENT_LABEL[a.type]}: ${a.reason}`,
                amount: `${a.type === 'LATE_FEE' ? '+' : '−'} ${soles(a.amount)}`,
                note: a.voidReason,
              })),
              ...o.payments.filter((p) => showVoided || p.status === 'ACTIVE').map((p) => ({
                key: p.id,
                voided: p.status === 'VOIDED',
                text: `Recibo ${p.receiptNumber ?? '—'} · ${formatPeruShortDate(p.paymentDate)} · ${methodLabel(p.paymentMethod)}${p.operationNumber ? ` op. ${p.operationNumber}` : ''}`,
                amount: soles(p.amountPaid),
                note: p.voidReason,
              })),
            ];
            return (
              <React.Fragment key={o.id}>
                <tr className={`border-t border-border ${o.status === 'CANCELLED' ? 'text-muted-foreground' : ''}`}>
                  <td className="p-1.5 whitespace-nowrap">{formatPeruShortDate(o.dueDate)}</td>
                  <td className="p-1.5">
                    {o.title}
                    {o.daysOverdue > 0 && <span className="ml-1 text-[10px] font-semibold text-destructive">({o.daysOverdue} días vencida)</span>}
                    {o.status === 'CANCELLED' && o.cancelReason && <span className="block text-[10px]">Anulada: {o.cancelReason}</span>}
                  </td>
                  <td className="p-1.5 text-right">{soles(o.original)}</td>
                  <td className="p-1.5 text-right">{o.discounts ? `− ${soles(o.discounts)}` : '—'}</td>
                  <td className="p-1.5 text-right">{o.lateFees ? soles(o.lateFees) : '—'}</td>
                  <td className="p-1.5 text-right font-semibold">{soles(o.net)}</td>
                  <td className="p-1.5 text-right">{soles(o.paid)}</td>
                  <td className={`p-1.5 text-right font-semibold ${o.balance > 0 ? 'text-amber-700 dark:text-amber-400' : ''}`}>{soles(o.balance)}</td>
                  <td className="p-1.5">
                    <Badge variant={STATUS[o.status].variant} className="text-[10px]">
                      {o.status === 'PAID' && o.net === 0 ? 'Exonerada' : STATUS[o.status].label}
                    </Badge>
                  </td>
                </tr>
                {details.map((d) => (
                  <tr key={d.key} className={`text-[10px] ${d.voided ? 'text-muted-foreground line-through' : 'text-muted-foreground'}`}>
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
            <td className="p-1.5 text-right">{soles(st.totals.original)}</td>
            <td className="p-1.5 text-right">− {soles(st.totals.discounts)}</td>
            <td className="p-1.5 text-right">{soles(st.totals.lateFees)}</td>
            <td className="p-1.5 text-right">{soles(st.totals.net)}</td>
            <td className="p-1.5 text-right">{soles(st.totals.paid)}</td>
            <td className="p-1.5 text-right">{soles(st.totals.balance)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  </section>
);

const Document: React.FC<{ data: FamilyStatement | StudentStatement; schoolName: string; showVoided: boolean; print?: boolean }> = ({ data, schoolName, showVoided, print }) => {
  const isFamily = 'children' in data;
  const children = isFamily ? data.children : [data];
  return (
    <div className={print ? 'mx-auto max-w-[190mm] space-y-4 bg-white p-4 text-black' : 'space-y-4'}>
      <div className="border-b border-border pb-2">
        <p className="text-xs font-semibold uppercase text-muted-foreground">{schoolName}</p>
        <h2 className="text-lg font-bold">Estado de cuenta {isFamily ? 'familiar' : 'del alumno'}</h2>
        {isFamily ? (
          <p className="text-xs text-muted-foreground">
            Apoderado: <strong className="text-foreground">{data.guardian.fullName}</strong>
            {data.guardian.documentId ? ` · DNI ${data.guardian.documentId}` : ''}
            {data.guardian.cellphone ? ` · Cel. ${data.guardian.cellphone}` : ''}
          </p>
        ) : (
          data.guardians.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Responsable de pagos:{' '}
              <strong className="text-foreground">
                {data.guardians
                  .filter((g) => g.isFinancialResponsible)
                  .concat(data.guardians.filter((g) => g.isFinancialResponsible).length ? [] : data.guardians.slice(0, 1))
                  .map((g) => `${g.firstName} ${g.lastNamePaternal}`)
                  .join(', ')}
              </strong>
            </p>
          )
        )}
        <p className="text-[10px] text-muted-foreground">Emitido el {formatPeruDateTime(data.generatedAt)}</p>
      </div>
      <TotalsStrip t={data.totals} />
      {children.map((c) => (
        <StudentBlock key={c.student.id} st={c} showVoided={showVoided} />
      ))}
      <p className="text-center text-[10px] text-muted-foreground">
        Documento informativo de control interno. Los recibos internos no son comprobantes electrónicos válidos ante SUNAT.
      </p>
    </div>
  );
};

/** Estado de cuenta imprimible y exportable a Excel (alumno o familia). */
export const StatementView: React.FC<{ data: FamilyStatement | StudentStatement; showVoided?: boolean }> = ({ data, showVoided = false }) => {
  const { data: school } = useGetActiveSchool();
  const schoolName = school?.name ?? 'Institución educativa';
  const isFamily = 'children' in data;
  const name = isFamily ? data.guardian.fullName : data.student.fullName;
  const { print, isPrinting } = usePrint({ pageSize: 'A4 portrait', margin: '10mm', title: `Estado_de_cuenta_${name}` });

  const exportExcel = () => {
    const children = isFamily ? data.children : [data];
    const rows = children.flatMap((c) => c.obligations.map((o) => ({ ...o, student: c.student.fullName, classroom: c.student.classroom })));
    const movements = children.flatMap((c) =>
      c.obligations.flatMap((o) => [
        ...o.adjustments.map((a) => ({ student: c.student.fullName, cuota: o.title, date: a.createdAt, kind: ADJUSTMENT_LABEL[a.type], number: a.number, detail: a.reason, amount: a.type === 'LATE_FEE' ? Number(a.amount) : -Number(a.amount), status: a.status === 'ACTIVE' ? 'Vigente' : `Anulado: ${a.voidReason ?? ''}` })),
        ...o.payments.map((p) => ({ student: c.student.fullName, cuota: o.title, date: p.paymentDate, kind: `Pago (${methodLabel(p.paymentMethod)})`, number: p.receiptNumber ?? '', detail: p.operationNumber ? `Op. ${p.operationNumber}` : '', amount: Number(p.amountPaid), status: p.status === 'ACTIVE' ? 'Vigente' : `Anulado: ${p.voidReason ?? ''}` })),
      ]),
    );
    void exportFinanceExcel(`estado-de-cuenta-${name.replace(/[^\w]+/g, '-')}`, schoolName, [
      {
        name: 'Cuotas',
        title: `Estado de cuenta — ${name}`,
        columns: [
          { header: 'Alumno', width: 30, value: (r) => r.student },
          { header: 'Aula', width: 10, value: (r) => r.classroom },
          { header: 'Vencimiento', type: 'date', width: 12, value: (r) => r.dueDate },
          { header: 'Concepto', width: 26, value: (r) => r.title },
          { header: 'Original', type: 'money', total: true, value: (r) => r.original },
          { header: 'Descuentos/becas', type: 'money', total: true, value: (r) => -r.discounts },
          { header: 'Moras', type: 'money', total: true, value: (r) => r.lateFees },
          { header: 'Neto', type: 'money', total: true, value: (r) => r.net },
          { header: 'Pagado', type: 'money', total: true, value: (r) => r.paid },
          { header: 'Saldo', type: 'money', total: true, value: (r) => r.balance },
          { header: 'Días vencida', type: 'number', width: 10, value: (r) => r.daysOverdue || null },
          { header: 'Estado', width: 12, value: (r) => STATUS[r.status].label },
        ],
        rows,
      },
      {
        name: 'Movimientos',
        title: `Pagos y ajustes — ${name}`,
        columns: [
          { header: 'Alumno', width: 30, value: (r) => r.student },
          { header: 'Cuota', width: 24, value: (r) => r.cuota },
          { header: 'Fecha', type: 'datetime', width: 16, value: (r) => r.date },
          { header: 'Tipo', width: 20, value: (r) => r.kind },
          { header: 'N°', width: 12, value: (r) => r.number },
          { header: 'Detalle', width: 40, value: (r) => r.detail },
          { header: 'Monto', type: 'money', value: (r) => r.amount },
          { header: 'Estado', width: 24, value: (r) => r.status },
        ],
        rows: movements,
      },
    ]);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={exportExcel}>
          <Download className="h-3.5 w-3.5" /> Excel
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={print} disabled={isPrinting}>
          <Printer className="h-3.5 w-3.5" /> Imprimir / PDF
        </Button>
      </div>
      <Document data={data} schoolName={schoolName} showVoided={showVoided} />
      {isPrinting && (
        <PrintPortal>
          <Document data={data} schoolName={schoolName} showVoided={showVoided} print />
        </PrintPortal>
      )}
    </div>
  );
};
