import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, CalendarRange, Copy, ListPlus, Loader2, Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAcademicYears } from '@/features/academic-years/api/useAcademicYears';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { useFinanceAccess } from '../api/usePayments';
import { apiError } from '../api/useCash';
import { soles } from '../components/CashMovements';
import {
  feeSummary,
  LEVEL_LABEL,
  MONTH_LONG,
  MONTH_SHORT,
  useCopyFeeSchedules,
  useDeleteFeeSchedule,
  useFeeSchedules,
  useGenerateMissing,
  useSaveFeeSchedule,
  type GenerateMissingResult,
  type EducationLevel,
  type FeeSchedule,
} from '../api/useFeeSchedules';

const LEVELS: EducationLevel[] = ['INITIAL', 'PRIMARY', 'SECONDARY'];

const scopeLabel = (f: Pick<FeeSchedule, 'educationLevel' | 'grade'>) =>
  f.grade === null ? 'Todo el nivel' : f.educationLevel === 'INITIAL' ? `${f.grade} años` : `${f.grade}° grado`;

// ──────────────────────────────────────────────────────────────────
// Formulario (crear / editar)
// ──────────────────────────────────────────────────────────────────
interface FormState {
  educationLevel: EducationLevel;
  grade: string; // '' = todo el nivel
  enrollmentFee: string;
  admissionFee: string;
  monthlyFee: string;
  firstMonth: number;
  lastMonth: number;
  dueDay: string;
}

const FeeScheduleModal: React.FC<{
  open: boolean;
  onClose: () => void;
  academicYearId: string;
  editing: FeeSchedule | null;
  initialLevel: EducationLevel;
  gradesByLevel: Record<EducationLevel, number[]>;
}> = ({ open, onClose, academicYearId, editing, initialLevel, gradesByLevel }) => {
  const save = useSaveFeeSchedule();
  const [applyToPending, setApplyToPending] = useState(false);
  const [f, setF] = useState<FormState>({
    educationLevel: initialLevel,
    grade: '',
    enrollmentFee: '',
    admissionFee: '',
    monthlyFee: '',
    firstMonth: 3,
    lastMonth: 12,
    dueDay: '31',
  });

  useEffect(() => {
    if (!open) return;
    setApplyToPending(false);
    setF(
      editing
        ? {
            educationLevel: editing.educationLevel,
            grade: editing.grade === null ? '' : String(editing.grade),
            enrollmentFee: String(editing.enrollmentFee),
            admissionFee: String(editing.admissionFee),
            monthlyFee: String(editing.monthlyFee),
            firstMonth: editing.firstMonth,
            lastMonth: editing.lastMonth,
            dueDay: String(editing.dueDay),
          }
        : { educationLevel: initialLevel, grade: '', enrollmentFee: '', admissionFee: '0', monthlyFee: '', firstMonth: 3, lastMonth: 12, dueDay: '31' },
    );
  }, [open, editing, initialLevel]);

  const nums = {
    enrollmentFee: Number(f.enrollmentFee || 0),
    admissionFee: Number(f.admissionFee || 0),
    monthlyFee: Number(f.monthlyFee || 0),
    dueDay: Number(f.dueDay),
  };
  const errors: string[] = [];
  if (f.monthlyFee === '' || nums.monthlyFee < 0) errors.push('Ingresa la pensión mensual.');
  if (nums.enrollmentFee < 0 || nums.admissionFee < 0) errors.push('Los montos no pueden ser negativos.');
  if (f.firstMonth > f.lastMonth) errors.push('El primer mes no puede ser posterior al último.');
  if (!Number.isInteger(nums.dueDay) || nums.dueDay < 1 || nums.dueDay > 31) errors.push('El día de vencimiento va de 1 a 31.');
  const summary = feeSummary({ ...nums, firstMonth: f.firstMonth, lastMonth: f.lastMonth });
  const grades = gradesByLevel[f.educationLevel] ?? [];

  const submit = () =>
    save.mutate(
      {
        id: editing?.id,
        applyToPending: !!editing && applyToPending,
        body: {
          academicYearId,
          educationLevel: f.educationLevel,
          grade: f.grade === '' ? null : Number(f.grade),
          enrollmentFee: nums.enrollmentFee,
          admissionFee: nums.admissionFee,
          monthlyFee: nums.monthlyFee,
          firstMonth: f.firstMonth,
          lastMonth: f.lastMonth,
          dueDay: nums.dueDay,
        },
      },
      {
        onSuccess: (r) => {
          toast.success(
            editing
              ? `Tarifario actualizado${applyToPending ? ` · ${r.repriced ?? 0} cuotas pendientes actualizadas` : ''}.`
              : 'Tarifario registrado.',
          );
          onClose();
        },
        onError: (e) => toast.error(apiError(e, 'No se pudo guardar el tarifario.')),
      },
    );

  const selectCls =
    'w-full text-xs rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar tarifario' : 'Nuevo tarifario'}
      description="Los montos aplican a las matrículas nuevas. Al editar, puedes llevarlos también a las cuotas pendientes ya generadas."
      size="lg"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" disabled={errors.length > 0} isLoading={save.isPending} onClick={submit}>
            Guardar tarifario
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold block mb-1">Nivel *</label>
            <select
              className={selectCls}
              value={f.educationLevel}
              disabled={!!editing}
              onChange={(e) => setF({ ...f, educationLevel: e.target.value as EducationLevel, grade: '' })}
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABEL[l]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-semibold block mb-1">Aplica a</label>
            <select className={selectCls} value={f.grade} disabled={!!editing} onChange={(e) => setF({ ...f, grade: e.target.value })}>
              <option value="">Todo el nivel</option>
              {grades.map((g) => (
                <option key={g} value={g}>
                  Solo {scopeLabel({ educationLevel: f.educationLevel, grade: g }).toLowerCase()}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">El tarifario de un grado tiene prioridad sobre el del nivel.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="font-semibold block mb-1">Matrícula (S/)</label>
            <Input type="number" min="0" step="0.01" className="text-xs rounded-xl font-mono" value={f.enrollmentFee} onChange={(e) => setF({ ...f, enrollmentFee: e.target.value })} placeholder="0.00" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Pensión mensual (S/) *</label>
            <Input type="number" min="0" step="0.01" className="text-xs rounded-xl font-mono" value={f.monthlyFee} onChange={(e) => setF({ ...f, monthlyFee: e.target.value })} placeholder="0.00" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Cuota de ingreso (S/)</label>
            <Input type="number" min="0" step="0.01" className="text-xs rounded-xl font-mono" value={f.admissionFee} onChange={(e) => setF({ ...f, admissionFee: e.target.value })} placeholder="0.00" />
            <p className="text-[10px] text-muted-foreground mt-1">Solo para alumnos ingresantes.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="font-semibold block mb-1">Pensión desde</label>
            <select className={selectCls} value={f.firstMonth} onChange={(e) => setF({ ...f, firstMonth: Number(e.target.value) })}>
              {MONTH_LONG.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-semibold block mb-1">Hasta</label>
            <select className={selectCls} value={f.lastMonth} onChange={(e) => setF({ ...f, lastMonth: Number(e.target.value) })}>
              {MONTH_LONG.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-semibold block mb-1">Vence el día</label>
            <Input type="number" min="1" max="31" className="text-xs rounded-xl font-mono" value={f.dueDay} onChange={(e) => setF({ ...f, dueDay: e.target.value })} />
            <p className="text-[10px] text-muted-foreground mt-1">31 = último día de cada mes.</p>
          </div>
        </div>

        {/* Resumen en vivo */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex flex-wrap items-center gap-x-6 gap-y-1">
          <span>
            <strong className="text-foreground">{summary.months}</strong> pensiones ({MONTH_SHORT[f.firstMonth - 1]}–{MONTH_SHORT[f.lastMonth - 1]})
          </span>
          <span>
            Total anual por alumno: <strong className="text-foreground font-mono">{soles(summary.annual)}</strong>
          </span>
          {nums.admissionFee > 0 && <span className="text-muted-foreground">+ {soles(nums.admissionFee)} si es ingresante</span>}
        </div>
        {editing && (
          <label className="flex items-start gap-2 rounded-xl border border-border p-3 cursor-pointer">
            <input type="checkbox" checked={applyToPending} onChange={(e) => setApplyToPending(e.target.checked)} className="w-4 h-4 mt-0.5 rounded" />
            <span>
              <strong className="text-foreground">Actualizar también las cuotas pendientes ya generadas</strong>
              <span className="block text-muted-foreground">
                Cambia el monto (y el día de vencimiento de las pensiones) de las cuotas sin cobros, descuentos, becas ni moras de este nivel
                {editing.grade !== null ? ' y grado' : ''}. Las pagadas, con ajustes o con pensión personalizada no se tocan. No agrega ni quita meses.
              </span>
            </span>
          </label>
        )}
        {errors.length > 0 && f.monthlyFee !== '' && <p className="text-[11px] text-destructive font-medium">{errors[0]}</p>}
      </div>
    </Modal>
  );
};

// ──────────────────────────────────────────────────────────────────
// Copiar de otro año
// ──────────────────────────────────────────────────────────────────
const CopyModal: React.FC<{ open: boolean; onClose: () => void; toYearId: string; years: { id: string; label: string }[] }> = ({ open, onClose, toYearId, years }) => {
  const copy = useCopyFeeSchedules();
  const options = years.filter((y) => y.id !== toYearId);
  const [from, setFrom] = useState('');
  useEffect(() => {
    if (open) setFrom(options[0]?.id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Copiar tarifario de otro año"
      description="Se copian los niveles y grados que aún no tienen tarifario en este año. Luego puedes ajustar los montos."
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={!from}
            isLoading={copy.isPending}
            onClick={() =>
              copy.mutate(
                { fromAcademicYearId: from, toAcademicYearId: toYearId },
                {
                  onSuccess: (r) => {
                    toast.success(r.copied ? `Se copiaron ${r.copied} tarifarios.` : 'No había tarifarios nuevos que copiar.');
                    onClose();
                  },
                  onError: (e) => toast.error(apiError(e, 'No se pudo copiar el tarifario.')),
                },
              )
            }
          >
            Copiar
          </Button>
        </>
      }
    >
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground">No hay otros años académicos registrados.</p>
      ) : (
        <select
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-full text-xs rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {options.map((y) => (
            <option key={y.id} value={y.id}>
              {y.label}
            </option>
          ))}
        </select>
      )}
    </Modal>
  );
};

// ──────────────────────────────────────────────────────────────────
// Página
// ──────────────────────────────────────────────────────────────────
export const FeeSchedulesPage: React.FC = () => {
  const { data: access, isLoading: accessLoading } = useFinanceAccess();
  const { data: years = [] } = useAcademicYears();
  const { data: classrooms = [] } = useClassrooms();
  const [yearId, setYearId] = useState('');
  const [modal, setModal] = useState<{ editing: FeeSchedule | null; level: EducationLevel } | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [deleting, setDeleting] = useState<FeeSchedule | null>(null);
  const remove = useDeleteFeeSchedule();
  const generateMissing = useGenerateMissing();
  const [missingPreview, setMissingPreview] = useState<GenerateMissingResult | null>(null);

  const previewMissing = () =>
    generateMissing.mutate(
      { academicYearId: yearId, dryRun: true },
      {
        onSuccess: (r) => (r.cuotas === 0 ? toast.info(`Todas las matrículas de ${r.year} ya tienen su cronograma completo.`) : setMissingPreview(r)),
        onError: (e) => toast.error(apiError(e, 'No se pudo calcular.')),
      },
    );
  const confirmMissing = () =>
    generateMissing.mutate(
      { academicYearId: yearId, dryRun: false },
      {
        onSuccess: (r) => {
          toast.success(`Se generaron ${r.cuotas} cuotas para ${r.withMissing} matrículas (${soles(r.total)}).`);
          setMissingPreview(null);
        },
        onError: (e) => toast.error(apiError(e, 'No se pudieron generar las cuotas.')),
      },
    );

  useEffect(() => {
    if (!yearId && years.length > 0) setYearId((years.find((y) => y.isActive) ?? years[0]).id);
  }, [years, yearId]);

  const { data: schedules = [], isLoading } = useFeeSchedules(yearId || undefined);
  const canManage = !!access?.can.manage;

  const gradesByLevel = useMemo(() => {
    const map: Record<EducationLevel, number[]> = { INITIAL: [], PRIMARY: [], SECONDARY: [] };
    for (const c of classrooms) {
      const lvl = c.educationLevel as EducationLevel;
      if (map[lvl] && !map[lvl].includes(c.grade)) map[lvl].push(c.grade);
    }
    for (const l of LEVELS) map[l].sort((a, b) => a - b);
    return map;
  }, [classrooms]);

  // Niveles con aulas o con tarifario; si no hay aulas aún, se muestran los tres
  const levels = useMemo(() => {
    const used = LEVELS.filter((l) => gradesByLevel[l].length > 0 || schedules.some((s) => s.educationLevel === l));
    return used.length > 0 ? used : LEVELS;
  }, [gradesByLevel, schedules]);

  const yearOptions = years.map((y) => ({ id: y.id, label: `${y.name || `Año Escolar ${y.year}`}${y.isActive ? ' (vigente)' : ''}` }));

  if (accessLoading) {
    return (
      <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span>Cargando...</span>
      </div>
    );
  }
  if (!access?.can.view && !canManage) {
    return <p className="p-6 text-sm text-muted-foreground">Solo tesorería, el contador y Dirección pueden ver el tarifario.</p>;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link to="/payments" className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Pagos y cobranzas
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">Tarifario de pensiones</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Montos por año y nivel. Al matricular se genera el cronograma de cuotas automáticamente.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={yearId}
            onChange={(e) => setYearId(e.target.value)}
            className="text-xs rounded-xl border border-input bg-background px-3 py-2 text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Año académico"
          >
            {yearOptions.map((y) => (
              <option key={y.id} value={y.id}>
                {y.label}
              </option>
            ))}
          </select>
          {canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs font-bold gap-1.5"
                onClick={previewMissing}
                disabled={!yearId || schedules.length === 0}
                isLoading={generateMissing.isPending && !missingPreview}
                title="Crea las cuotas que les faltan a las matrículas de este año (p. ej. registradas antes de configurar el tarifario)"
              >
                <ListPlus className="w-3.5 h-3.5" /> Generar cuotas faltantes
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold gap-1.5" onClick={() => setCopyOpen(true)} disabled={!yearId}>
                <Copy className="w-3.5 h-3.5" /> Copiar de otro año
              </Button>
              <Button size="sm" className="rounded-xl text-xs font-bold gap-1.5" onClick={() => setModal({ editing: null, level: levels[0] })} disabled={!yearId}>
                <Plus className="w-3.5 h-3.5" /> Nuevo tarifario
              </Button>
            </>
          )}
        </div>
      </div>

      {years.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-12 text-center text-muted-foreground space-y-2">
          <CalendarRange className="w-10 h-10 mx-auto opacity-30" />
          <p className="text-sm font-bold text-foreground">Primero registra un año académico</p>
        </div>
      ) : isLoading ? (
        <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Cargando tarifario...</span>
        </div>
      ) : (
        <div className="grid gap-4">
          {levels.map((level) => {
            const rows = schedules.filter((s) => s.educationLevel === level);
            const hasLevelWide = rows.some((r) => r.grade === null);
            return (
              <div key={level} className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black text-foreground">{LEVEL_LABEL[level]}</h2>
                    {rows.length === 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400">
                        Sin tarifario: las matrículas no generarán cuotas
                      </span>
                    ) : !hasLevelWide ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-secondary-foreground">
                        Solo algunos grados
                      </span>
                    ) : null}
                  </div>
                  {canManage && (
                    <Button variant="ghost" size="sm" className="h-7 text-[11px] font-bold text-primary gap-1" onClick={() => setModal({ editing: null, level })}>
                      <Plus className="w-3 h-3" /> Agregar
                    </Button>
                  )}
                </div>
                {rows.length === 0 ? (
                  <p className="px-4 py-6 text-xs text-muted-foreground text-center">
                    {canManage ? 'Agrega el tarifario de este nivel para generar cuotas al matricular.' : 'Aún no se configuró.'}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 border-b border-border text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                        <tr>
                          <th className="px-4 py-3">Aplica a</th>
                          <th className="px-4 py-3 text-right">Matrícula</th>
                          <th className="px-4 py-3 text-right">Pensión</th>
                          <th className="px-4 py-3 text-right">Cuota de ingreso</th>
                          <th className="px-4 py-3">Meses</th>
                          <th className="px-4 py-3">Vence</th>
                          <th className="px-4 py-3 text-right">Total anual</th>
                          {canManage && <th className="px-4 py-3 text-right">Acciones</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {rows.map((r) => {
                          const sum = feeSummary(r);
                          return (
                            <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 font-bold text-foreground whitespace-nowrap">{scopeLabel(r)}</td>
                              <td className="px-4 py-3 text-right font-mono whitespace-nowrap">{soles(r.enrollmentFee)}</td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-foreground whitespace-nowrap">{soles(r.monthlyFee)}</td>
                              <td className="px-4 py-3 text-right font-mono whitespace-nowrap text-muted-foreground">
                                {r.admissionFee > 0 ? soles(r.admissionFee) : '—'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-secondary-foreground">
                                  {MONTH_SHORT[r.firstMonth - 1]}–{MONTH_SHORT[r.lastMonth - 1]} · {sum.months} cuotas
                                </span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                {r.dueDay === 31 ? 'Último día del mes' : `Día ${r.dueDay}`}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-foreground whitespace-nowrap">{soles(sum.annual)}</td>
                              {canManage && (
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="Editar" onClick={() => setModal({ editing: r, level })}>
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      aria-label="Eliminar"
                                      onClick={() => setDeleting(r)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Si un alumno se matricula a mitad de año, solo se generan las pensiones desde su mes de ingreso. Las becas vigentes se aplican
        automáticamente y, al retirar o trasladar a un alumno, se anulan sus cuotas futuras sin cobros.
      </p>

      {modal && yearId && (
        <FeeScheduleModal
          open
          onClose={() => setModal(null)}
          academicYearId={yearId}
          editing={modal.editing}
          initialLevel={modal.level}
          gradesByLevel={gradesByLevel}
        />
      )}
      <CopyModal open={copyOpen} onClose={() => setCopyOpen(false)} toYearId={yearId} years={yearOptions} />
      <ConfirmDialog
        isOpen={!!missingPreview}
        onClose={() => setMissingPreview(null)}
        variant="info"
        title={`Generar cuotas faltantes de ${missingPreview?.year ?? ''}`}
        description={
          missingPreview
            ? `Se crearán ${missingPreview.cuotas} cuotas por ${soles(missingPreview.total)} para ${missingPreview.withMissing} de ${missingPreview.enrollments} matrículas. No se duplica ningún periodo ni se recrean cuotas anuladas.`
            : ''
        }
        details={
          missingPreview && missingPreview.withoutFeeSchedule > 0 ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {missingPreview.withoutFeeSchedule} matrículas siguen sin cuotas porque su nivel no tiene tarifario.
            </p>
          ) : undefined
        }
        confirmText="Generar cuotas"
        isLoading={generateMissing.isPending}
        onConfirm={confirmMissing}
      />
      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        variant="danger"
        title="¿Eliminar este tarifario?"
        description={
          deleting
            ? `${LEVEL_LABEL[deleting.educationLevel]} · ${scopeLabel(deleting)}. Las cuotas ya generadas no cambian, pero las nuevas matrículas de este nivel ya no tendrán cronograma.`
            : ''
        }
        confirmText="Eliminar"
        isLoading={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success('Tarifario eliminado.');
              setDeleting(null);
            },
            onError: (e) => toast.error(apiError(e, 'No se pudo eliminar.')),
          })
        }
      />
    </div>
  );
};
