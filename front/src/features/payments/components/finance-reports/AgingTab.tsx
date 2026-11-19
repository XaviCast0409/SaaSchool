import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatEducationLevel } from '@/lib/utils';
import { formatPeruShortDate } from '@/lib/dateUtils';
import { formatMoney } from '@/lib/format';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { AGING_BUCKETS, useAgingReport } from '../../api/useFinance';
import { exportFinanceExcel, type ExcelSheet } from '../../utils/financeExcel';
import { sel } from './constants';
import { useSchoolName } from './useSchoolName';
import { ExcelButton } from './FinanceReportsUI';

export const AgingTab: React.FC = () => {
  const schoolName = useSchoolName();
  const [classroomId, setClassroomId] = useState('');
  const { data: classrooms = [] } = useClassrooms(true);
  const { data, isLoading } = useAgingReport(classroomId || undefined);
  const [open, setOpen] = useState<string | null>(null);

  const exportExcel = () =>
    data &&
    void exportFinanceExcel(`morosidad-${data.asOf}`, schoolName, [
      {
        name: 'Morosidad',
        title: 'Morosidad y antigüedad de deuda',
        subtitle: `al ${formatPeruShortDate(data.asOf)}`,
        columns: [
          { header: 'Alumno', width: 32, value: (r) => r.student },
          { header: 'DNI', width: 11, value: (r) => r.documentId },
          { header: 'Aula', width: 9, value: (r) => r.classroom },
          { header: 'Responsable de pagos', width: 26, value: (r) => r.guardian },
          { header: 'Celular', width: 13, value: (r) => r.phone },
          { header: 'Correo', width: 26, value: (r) => r.email },
          { header: 'Cuotas vencidas', type: 'number', width: 10, total: true, value: (r) => r.cuotas },
          { header: 'Días (máx.)', type: 'number', width: 9, value: (r) => r.maxDays },
          ...AGING_BUCKETS.map((b) => ({
            header: `${b} días`,
            type: 'money' as const,
            total: true,
            value: (r: (typeof data.rows)[number]) => r.buckets[b],
          })),
          { header: 'Total vencido', type: 'money', total: true, value: (r) => r.total },
        ],
        rows: data.rows,
      } as ExcelSheet<(typeof data.rows)[number]>,
      {
        name: 'Detalle',
        title: 'Cuotas vencidas',
        subtitle: `al ${formatPeruShortDate(data.asOf)}`,
        columns: [
          { header: 'Alumno', width: 32, value: (r) => r.student },
          { header: 'Aula', width: 9, value: (r) => r.classroom },
          { header: 'Cuota', width: 26, value: (r) => r.title },
          { header: 'Vencimiento', type: 'date', width: 12, value: (r) => r.dueDate },
          { header: 'Días', type: 'number', width: 8, value: (r) => r.days },
          { header: 'Saldo', type: 'money', total: true, value: (r) => r.balance },
        ],
        rows: data.rows.flatMap((r) => r.items.map((i) => ({ ...i, student: r.student, classroom: r.classroom }))),
      } as ExcelSheet<{
        student: string;
        classroom: string;
        title: string;
        dueDate: string;
        days: number;
        balance: number;
      }>,
    ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1 text-xs font-semibold text-muted-foreground">
          Aula
          <select className={`${sel} block`} value={classroomId} onChange={(e) => setClassroomId(e.target.value)}>
            <option value="">Todas</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.grade}° "{c.section}" - {formatEducationLevel(c.educationLevel)}
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-xs font-bold uppercase text-destructive">Total vencido</p>
              <p className="text-xl font-black">{formatMoney(data.total)}</p>
              <p className="text-xs text-muted-foreground">{data.students} alumnos</p>
            </div>
            {AGING_BUCKETS.map((b) => (
              <div key={b} className="rounded-xl border border-border p-3">
                <p className="text-xs font-bold uppercase text-muted-foreground">{b} días</p>
                <p className="text-lg font-black">{formatMoney(data.buckets[b])}</p>
                <p className="text-xs text-muted-foreground">
                  {data.total ? ((data.buckets[b] / data.total) * 100).toFixed(1) : '0'} %
                </p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-2">Alumno</th>
                  <th className="p-2">Responsable</th>
                  <th className="p-2 text-right">Cuotas</th>
                  <th className="p-2 text-right">Días máx.</th>
                  {AGING_BUCKETS.map((b) => (
                    <th key={b} className="p-2 text-right">
                      {b}
                    </th>
                  ))}
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <React.Fragment key={r.studentId}>
                    <tr
                      className="cursor-pointer border-t border-border hover:bg-muted/30"
                      onClick={() => setOpen(open === r.studentId ? null : r.studentId)}
                    >
                      <td className="p-2">
                        <span className="font-medium">{r.student}</span>
                        <span className="block text-xs text-muted-foreground">{r.classroom}</span>
                      </td>
                      <td className="p-2">
                        {r.guardian}
                        {r.phone && <span className="block text-xs text-muted-foreground">{r.phone}</span>}
                      </td>
                      <td className="p-2 text-right">{r.cuotas}</td>
                      <td className="p-2 text-right">{r.maxDays}</td>
                      {AGING_BUCKETS.map((b) => (
                        <td key={b} className="p-2 text-right">
                          {r.buckets[b] ? formatMoney(r.buckets[b]) : '—'}
                        </td>
                      ))}
                      <td className="p-2 text-right font-bold text-destructive">{formatMoney(r.total)}</td>
                    </tr>
                    {open === r.studentId &&
                      r.items.map((i) => (
                        <tr key={i.title + i.dueDate} className="bg-muted/20 text-xs text-muted-foreground">
                          <td className="px-2 py-1" colSpan={3}>
                            ↳ {i.title} · venció {formatPeruShortDate(i.dueDate)}
                          </td>
                          <td className="px-2 py-1 text-right">{i.days}</td>
                          <td colSpan={4} />
                          <td className="px-2 py-1 text-right">{formatMoney(i.balance)}</td>
                        </tr>
                      ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
