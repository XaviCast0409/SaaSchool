import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BarChart3, Download } from 'lucide-react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { formatPeruDateTime, formatPeruShortDate, getPeruToday } from '@/lib/dateUtils';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { useStudents } from '@/features/students/api/useStudents';
import { useGetActiveSchool } from '@/features/schools/api/useSchool';
import { useFinanceAccess } from '../api/usePayments';
import { useCashiers } from '../api/useCash';
import {
  ADJUSTMENT_LABEL,
  AGING_BUCKETS,
  useAdjustments,
  useAgingReport,
  useCollectionsReport,
  useFamilyStatement,
  useGuardianSearch,
  useMonthlyReport,
  useStudentStatement,
  type AdjustmentType,
  type GroupRow,
} from '../api/useFinance';
import { EXPENSE_CATEGORY_LABEL, PAYMENT_METHODS, PAYMENT_METHOD_LABEL, methodLabel, personName, type CashExpense } from '../types';
import { ExpensesList, soles } from '../components/CashMovements';
import { StatementView } from '../components/StatementView';
import { exportFinanceExcel, type ExcelSheet } from '../utils/financeExcel';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const CONCEPTS: Record<string, string> = {
  PENSION: 'Pensión',
  MATRICULA: 'Matrícula',
  LIBROS_MATERIALES: 'Libros y materiales',
  UNIFORME: 'Uniforme',
  CARNET_AGENDA: 'Carné / agenda',
  EXCURSION_EVENTO: 'Excursión / evento',
  OTROS: 'Otros',
};
const sel = 'rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground';
const monthStart = () => `${getPeruToday().slice(0, 8)}01`;
const studentName = (s: { firstNames: string; lastNamePaternal: string; lastNameMaternal?: string | null }) => `${s.lastNamePaternal} ${s.lastNameMaternal ?? ''}, ${s.firstNames}`;

const useSchoolName = () => useGetActiveSchool().data?.name ?? 'Institución educativa';

const ExcelButton: React.FC<{ onClick: () => void; disabled?: boolean }> = ({ onClick, disabled }) => (
  <Button variant="outline" size="sm" className="gap-1.5" onClick={onClick} disabled={disabled}>
    <Download className="h-3.5 w-3.5" /> Exportar a Excel
  </Button>
);

const DateRange: React.FC<{ start: string; end: string; onChange: (s: string, e: string) => void }> = ({ start, end, onChange }) => (
  <>
    <label className="space-y-1 text-[11px] font-semibold text-muted-foreground">
      Desde
      <input type="date" className={`${sel} block`} value={start} onChange={(e) => onChange(e.target.value, end)} />
    </label>
    <label className="space-y-1 text-[11px] font-semibold text-muted-foreground">
      Hasta
      <input type="date" className={`${sel} block`} value={end} onChange={(e) => onChange(start, e.target.value)} />
    </label>
  </>
);

const GroupTable: React.FC<{ title: string; rows: GroupRow[]; label?: (k: string) => string; total: number }> = ({ title, rows, label, total }) => (
  <div className="rounded-lg border border-border">
    <p className="border-b border-border bg-muted/40 px-3 py-1.5 text-[11px] font-bold uppercase text-muted-foreground">{title}</p>
    <table className="w-full text-xs">
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-t border-border first:border-t-0">
            <td className="p-2">{label ? label(r.key) : r.key}</td>
            <td className="p-2 text-right text-muted-foreground">{r.count}</td>
            <td className="p-2 text-right font-semibold">{soles(r.total)}</td>
            <td className="p-2 text-right text-muted-foreground">{total ? `${((r.total / total) * 100).toFixed(1)} %` : ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── Estado de cuenta ──────────────────────────────────────────────
const StatementTab: React.FC = () => {
  const [mode, setMode] = useState<'student' | 'family'>('student');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const { data: studentsData } = useStudents({ page: 1, limit: 20, search: search || undefined }, mode === 'student' && search.trim().length >= 2);
  const { data: guardians = [] } = useGuardianSearch(mode === 'family' ? search : '');
  const student = useStudentStatement(mode === 'student' ? selected : null);
  const family = useFamilyStatement(mode === 'family' ? selected : null);
  const data = mode === 'student' ? student.data : family.data;
  const loading = mode === 'student' ? student.isLoading : family.isLoading;
  const options =
    mode === 'student'
      ? (studentsData?.data ?? []).map((s) => ({ id: s.id, label: `${studentName(s)}${s.documentId ? ` — ${s.documentId}` : ''}` }))
      : guardians.map((g) => ({
          id: g.id,
          label: `${g.lastNamePaternal} ${g.lastNameMaternal}, ${g.firstName} — hijos: ${g.familyRelations.map((r) => `${r.student.firstNames} ${r.student.lastNamePaternal}`).join(', ')}`,
        }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="inline-flex rounded-lg border border-border p-0.5 text-xs">
          {(['student', 'family'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setSelected(null);
                setSearch('');
              }}
              className={`rounded-md px-3 py-1.5 font-semibold ${mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              {m === 'student' ? 'Por alumno' : 'Por familia (apoderado)'}
            </button>
          ))}
        </div>
        <div className="min-w-[260px] flex-1 space-y-1">
          <Input
            placeholder={mode === 'student' ? 'Buscar alumno por apellido o DNI' : 'Buscar apoderado por apellido, DNI o apellido del hijo'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      {search.trim().length >= 2 && options.length > 0 && !selected && (
        <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border text-sm">
          {options.map((o) => (
            <li key={o.id}>
              <button type="button" className="w-full px-3 py-2 text-left hover:bg-muted" onClick={() => setSelected(o.id)}>
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelected(null)}>
          ← Elegir otro
        </Button>
      )}
      {selected && (loading || !data ? <Skeleton className="h-64 w-full" /> : <StatementView data={data} showVoided />)}
      {!selected && <p className="text-sm text-muted-foreground">Busca un alumno o un apoderado para ver su estado de cuenta (cuotas, descuentos, moras, pagos y saldo).</p>}
    </div>
  );
};

// ── Ingresos ──────────────────────────────────────────────────────
const CollectionsTab: React.FC = () => {
  const schoolName = useSchoolName();
  const [f, setF] = useState({ startDate: monthStart(), endDate: getPeruToday(), cashierId: '', method: '', concept: '' });
  const { data: cashiers = [] } = useCashiers();
  const { data, isLoading } = useCollectionsReport(f);
  const subtitle = `${formatPeruShortDate(f.startDate)} al ${formatPeruShortDate(f.endDate)}`;

  const exportExcel = () => {
    if (!data) return;
    const group = (name: string, title: string, rows: GroupRow[], label?: (k: string) => string): ExcelSheet<GroupRow> => ({
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
          { header: 'Aula', width: 8, value: (r) => `${r.obligation.enrollment.classroom.grade}° ${r.obligation.enrollment.classroom.section}` },
          { header: 'Cuota', width: 26, value: (r) => r.obligation.title },
          { header: 'Concepto', width: 16, value: (r) => CONCEPTS[r.obligation.concept] ?? r.obligation.concept },
          { header: 'Medio', width: 13, value: (r) => methodLabel(r.paymentMethod) },
          { header: 'N° operación', width: 16, value: (r) => r.operationNumber },
          { header: 'Cobró', width: 20, value: (r) => (r.collectedBy ? personName(r.collectedBy) : 'Voucher validado') },
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
        <label className="space-y-1 text-[11px] font-semibold text-muted-foreground">
          Cajero
          <select className={`${sel} block`} value={f.cashierId} onChange={(e) => setF({ ...f, cashierId: e.target.value })}>
            <option value="">Todos</option>
            {cashiers.map((c) => (
              <option key={c.id} value={c.id}>
                {personName(c)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-[11px] font-semibold text-muted-foreground">
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
        <label className="space-y-1 text-[11px] font-semibold text-muted-foreground">
          Concepto
          <select className={`${sel} block`} value={f.concept} onChange={(e) => setF({ ...f, concept: e.target.value })}>
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
              <p className="text-[11px] font-bold uppercase text-primary">Total ingresado</p>
              <p className="text-xl font-black">{soles(data.total)}</p>
              <p className="text-[11px] text-muted-foreground">{data.count} cobros vigentes</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Recibos anulados</p>
              <p className="text-xl font-black">{data.voided.count}</p>
              <p className="text-[11px] text-muted-foreground">{soles(data.voided.total)} (no suman)</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Promedio por cobro</p>
              <p className="text-xl font-black">{soles(data.count ? data.total / data.count : 0)}</p>
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

// ── Morosidad ─────────────────────────────────────────────────────
const AgingTab: React.FC = () => {
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
          ...AGING_BUCKETS.map((b) => ({ header: `${b} días`, type: 'money' as const, total: true, value: (r: (typeof data.rows)[number]) => r.buckets[b] })),
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
      } as ExcelSheet<{ student: string; classroom: string; title: string; dueDate: string; days: number; balance: number }>,
    ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1 text-[11px] font-semibold text-muted-foreground">
          Aula
          <select className={`${sel} block`} value={classroomId} onChange={(e) => setClassroomId(e.target.value)}>
            <option value="">Todas</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.grade}° "{c.section}" - {c.educationLevel}
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
              <p className="text-[11px] font-bold uppercase text-destructive">Total vencido</p>
              <p className="text-xl font-black">{soles(data.total)}</p>
              <p className="text-[11px] text-muted-foreground">{data.students} alumnos</p>
            </div>
            {AGING_BUCKETS.map((b) => (
              <div key={b} className="rounded-xl border border-border p-3">
                <p className="text-[11px] font-bold uppercase text-muted-foreground">{b} días</p>
                <p className="text-lg font-black">{soles(data.buckets[b])}</p>
                <p className="text-[11px] text-muted-foreground">{data.total ? ((data.buckets[b] / data.total) * 100).toFixed(1) : '0'} %</p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
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
                    <tr className="cursor-pointer border-t border-border hover:bg-muted/30" onClick={() => setOpen(open === r.studentId ? null : r.studentId)}>
                      <td className="p-2">
                        <span className="font-medium">{r.student}</span>
                        <span className="block text-[11px] text-muted-foreground">{r.classroom}</span>
                      </td>
                      <td className="p-2">
                        {r.guardian}
                        {r.phone && <span className="block text-[11px] text-muted-foreground">{r.phone}</span>}
                      </td>
                      <td className="p-2 text-right">{r.cuotas}</td>
                      <td className="p-2 text-right">{r.maxDays}</td>
                      {AGING_BUCKETS.map((b) => (
                        <td key={b} className="p-2 text-right">
                          {r.buckets[b] ? soles(r.buckets[b]) : '—'}
                        </td>
                      ))}
                      <td className="p-2 text-right font-bold text-destructive">{soles(r.total)}</td>
                    </tr>
                    {open === r.studentId &&
                      r.items.map((i) => (
                        <tr key={i.title + i.dueDate} className="bg-muted/20 text-[11px] text-muted-foreground">
                          <td className="px-2 py-1" colSpan={3}>
                            ↳ {i.title} · venció {formatPeruShortDate(i.dueDate)}
                          </td>
                          <td className="px-2 py-1 text-right">{i.days}</td>
                          <td colSpan={4} />
                          <td className="px-2 py-1 text-right">{soles(i.balance)}</td>
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

// ── Resumen mensual ───────────────────────────────────────────────
const MonthlyTab: React.FC = () => {
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
          ...cols.map(([k, label]) => ({ header: label, type: 'money' as const, total: true, width: 16, value: (r: (typeof data.months)[number]) => r[k] })),
        ],
        rows: data.months,
      } as ExcelSheet<(typeof data.months)[number]>,
    ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1 text-[11px] font-semibold text-muted-foreground">
          Año
          <select className={`${sel} block`} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[thisYear - 2, thisYear - 1, thisYear, thisYear + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <p className="text-[11px] text-muted-foreground">
          Lo emitido se agrupa por mes de vencimiento; "Ingresó en el mes" y los egresos, por la fecha real del movimiento.
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
            <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
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
                      {m[k] ? soles(m[k]) : '—'}
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
                    {soles(data.totals[k])}
                  </td>
                ))}
                <td className="p-2 text-right">{data.totals.net ? `${((data.totals.paid / data.totals.net) * 100).toFixed(1)} %` : '—'}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Descuentos, becas, moras y notas de crédito ───────────────────
const AdjustmentsTab: React.FC = () => {
  const schoolName = useSchoolName();
  const [f, setF] = useState<{ startDate: string; endDate: string; type: '' | AdjustmentType }>({ startDate: `${getPeruToday().slice(0, 4)}-01-01`, endDate: getPeruToday(), type: '' });
  const { data = [], isLoading } = useAdjustments({ startDate: f.startDate, endDate: f.endDate, type: f.type || undefined });
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
          { header: 'Alumno', width: 30, value: (r) => (r.obligation ? studentName(r.obligation.enrollment.student) : '') },
          { header: 'Cuota', width: 24, value: (r) => r.obligation?.title },
          { header: 'Motivo', width: 40, value: (r) => r.reason },
          { header: 'Registró', width: 18, value: (r) => personName(r.createdBy) },
          { header: 'Efecto en deuda', type: 'money', total: true, value: (r) => (r.status === 'ACTIVE' ? (r.type === 'LATE_FEE' ? 1 : -1) * Number(r.amount) : 0) },
          { header: 'Estado', width: 26, value: (r) => (r.status === 'ACTIVE' ? 'Vigente' : `Anulado por ${personName(r.voidedBy)}: ${r.voidReason ?? ''}`) },
        ],
        rows: data,
      } as ExcelSheet<(typeof data)[number]>,
    ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <DateRange start={f.startDate} end={f.endDate} onChange={(s, e) => setF({ ...f, startDate: s, endDate: e })} />
        <label className="space-y-1 text-[11px] font-semibold text-muted-foreground">
          Tipo
          <select className={`${sel} block`} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as '' | AdjustmentType })}>
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
            <p className="text-[11px] font-bold uppercase text-muted-foreground">{ADJUSTMENT_LABEL[t]}</p>
            <p className="text-lg font-black">{soles(sum(t))}</p>
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
            <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
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
                  <tr key={a.id} className={`border-t border-border align-top ${voided ? 'bg-destructive/5 text-muted-foreground' : ''}`}>
                    <td className="p-2 font-mono whitespace-nowrap">
                      <span className={voided ? 'line-through' : ''}>{a.number}</span>
                      {voided && <Badge variant="destructive" className="ml-1 text-[10px]">Anulado</Badge>}
                    </td>
                    <td className="p-2 whitespace-nowrap">{formatPeruDateTime(a.createdAt)}</td>
                    <td className="p-2">{ADJUSTMENT_LABEL[a.type]}</td>
                    <td className="p-2">
                      {a.obligation ? studentName(a.obligation.enrollment.student) : ''}
                      <span className="block text-[11px] text-muted-foreground">{a.obligation?.title}</span>
                    </td>
                    <td className="p-2">
                      {a.reason}
                      {voided && <span className="block text-[11px] text-destructive">Anulado: {a.voidReason}</span>}
                    </td>
                    <td className="p-2 whitespace-nowrap">{personName(a.createdBy)}</td>
                    <td className={`p-2 text-right font-semibold whitespace-nowrap ${voided ? 'line-through' : ''}`}>
                      {a.type === 'LATE_FEE' ? '+' : '−'} {soles(a.amount)}
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

// ── Egresos ───────────────────────────────────────────────────────
const ExpensesTab: React.FC = () => {
  const schoolName = useSchoolName();
  const [r, setR] = useState({ startDate: monthStart(), endDate: getPeruToday() });
  const { data = [], isLoading } = useQuery({
    queryKey: ['report', 'expenses', r],
    queryFn: async () => (await api.get<{ data: CashExpense[] }>('/payments/cash/expenses', { params: r })).data.data,
  });
  const active = data.filter((e) => e.status === 'ACTIVE');
  const total = active.reduce((s, e) => s + Number(e.amount), 0);
  const byCategory = Object.entries(
    active.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.category]: (acc[e.category] ?? 0) + Number(e.amount) }), {}),
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
          { header: 'Estado', width: 24, value: (e) => (e.status === 'ACTIVE' ? 'Vigente' : `Anulado: ${e.voidReason ?? ''}`) },
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
          <p className="text-[11px] font-bold uppercase text-muted-foreground">Total egresos</p>
          <p className="text-xl font-black">{soles(total)}</p>
          <p className="text-[11px] text-muted-foreground">{active.length} vigentes</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {byCategory.map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border px-3 py-2 text-xs">
              <p className="text-muted-foreground">{EXPENSE_CATEGORY_LABEL[k] ?? k}</p>
              <p className="font-bold">{soles(v)}</p>
            </div>
          ))}
        </div>
      </div>
      {isLoading ? <Skeleton className="h-40 w-full" /> : <ExpensesList expenses={data} />}
    </div>
  );
};

const TABS = [
  ['statement', 'Estado de cuenta'],
  ['collections', 'Ingresos'],
  ['aging', 'Morosidad'],
  ['monthly', 'Resumen mensual'],
  ['adjustments', 'Descuentos y moras'],
  ['expenses', 'Egresos'],
] as const;
type Tab = (typeof TABS)[number][0];

export const FinanceReportsPage: React.FC = () => {
  const { data: access, isLoading } = useFinanceAccess();
  const [tab, setTab] = useState<Tab>('statement');
  if (isLoading || !access) return <Skeleton className="h-64 w-full rounded-xl" />;
  const canReports = access.can.view;
  const visible = TABS.filter(([k]) => canReports || k === 'statement');

  return (
    <div className="space-y-6 pb-8">
      <div className="border-b border-border pb-4">
        <Link to="/payments" className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Pagos y cobranzas
        </Link>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Reportes financieros</h1>
          <Badge variant="outline">{access.label}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Estados de cuenta, ingresos, morosidad y resúmenes para el contador, exportables a Excel.</p>
      </div>
      <div className="flex flex-wrap gap-1 rounded-lg border border-border p-0.5 text-sm">
        {visible.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-md px-3 py-1.5 font-semibold ${tab === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
            {label}
          </button>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6">
          {tab === 'statement' && <StatementTab />}
          {tab === 'collections' && canReports && <CollectionsTab />}
          {tab === 'aging' && canReports && <AgingTab />}
          {tab === 'monthly' && canReports && <MonthlyTab />}
          {tab === 'adjustments' && canReports && <AdjustmentsTab />}
          {tab === 'expenses' && canReports && <ExpensesTab />}
        </CardContent>
      </Card>
    </div>
  );
};
