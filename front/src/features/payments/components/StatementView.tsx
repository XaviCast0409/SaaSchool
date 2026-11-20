import React from 'react';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PrintPortal, usePrint } from '@/lib/print';
import { useGetActiveSchool } from '@/features/schools/api/useSchool';
import { ADJUSTMENT_LABEL, type FamilyStatement, type StudentStatement } from '../api/useFinance';
import { methodLabel } from '../types';
import { exportFinanceExcel } from '../utils/financeExcel';
import { StatementDocument } from './statement-view/StatementDocument';
import { STATEMENT_STATUS } from './statement-view/StudentBlock';

/** Estado de cuenta imprimible y exportable a Excel (alumno o familia). */
export const StatementView: React.FC<{ data: FamilyStatement | StudentStatement; showVoided?: boolean }> = ({
  data,
  showVoided = false,
}) => {
  const { data: school } = useGetActiveSchool();
  const schoolName = school?.name ?? 'Institución educativa';
  const isFamily = 'children' in data;
  const name = isFamily ? data.guardian.fullName : data.student.fullName;
  const { print, isPrinting } = usePrint({
    pageSize: 'A4 portrait',
    margin: '10mm',
    title: `Estado_de_cuenta_${name}`,
  });

  const exportExcel = () => {
    const children = isFamily ? data.children : [data];
    const rows = children.flatMap((c) =>
      c.obligations.map((o) => ({ ...o, student: c.student.fullName, classroom: c.student.classroom })),
    );
    const movements = children.flatMap((c) =>
      c.obligations.flatMap((o) => [
        ...o.adjustments.map((a) => ({
          student: c.student.fullName,
          cuota: o.title,
          date: a.createdAt,
          kind: ADJUSTMENT_LABEL[a.type],
          number: a.number,
          detail: a.reason,
          amount: a.type === 'LATE_FEE' ? Number(a.amount) : -Number(a.amount),
          status: a.status === 'ACTIVE' ? 'Vigente' : `Anulado: ${a.voidReason ?? ''}`,
        })),
        ...o.payments.map((p) => ({
          student: c.student.fullName,
          cuota: o.title,
          date: p.paymentDate,
          kind: `Pago (${methodLabel(p.paymentMethod)})`,
          number: p.receiptNumber ?? '',
          detail: p.operationNumber ? `Op. ${p.operationNumber}` : '',
          amount: Number(p.amountPaid),
          status: p.status === 'ACTIVE' ? 'Vigente' : `Anulado: ${p.voidReason ?? ''}`,
        })),
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
          { header: 'Estado', width: 12, value: (r) => STATEMENT_STATUS[r.status].label },
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
      <StatementDocument data={data} schoolName={schoolName} showVoided={showVoided} />
      {isPrinting && (
        <PrintPortal>
          <StatementDocument data={data} schoolName={schoolName} showVoided={showVoided} print />
        </PrintPortal>
      )}
    </div>
  );
};
