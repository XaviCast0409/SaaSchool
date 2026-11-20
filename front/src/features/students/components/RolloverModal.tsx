import { getApiErrorMessage } from '@/lib/errors';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, Repeat2, XCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useAcademicYears, pickEnrollmentTargetYear } from '@/features/academic-years/api/useAcademicYears';
import { soles } from '@/features/payments/components/CashMovements';
import {
  classroomLabel,
  useRollover,
  useRolloverCandidates,
  type RolloverFlag,
  type RolloverResult,
  type RolloverRow,
} from '@/features/enrollments/api/useRollover';

const FLAG: Partial<Record<RolloverFlag, { label: string; cls: string }>> = {
  ALREADY_ENROLLED: { label: 'Ya matriculado', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  GRADUATES: { label: 'Egresa', cls: 'bg-secondary text-secondary-foreground' },
  DECLINED: { label: 'No continúa', cls: 'bg-destructive/15 text-destructive' },
  CONFIRMED: { label: 'Ratificó', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  NO_RATIFICATION: { label: 'Sin ratificar', cls: 'bg-muted text-muted-foreground' },
  RECOVERY: { label: 'Recuperación', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  REPEATS: { label: 'Repite', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  NO_FINAL_SITUATION: { label: 'Sin situación final', cls: 'bg-muted text-muted-foreground' },
  NO_TARGET_CLASSROOM: { label: 'Sin aula destino', cls: 'bg-destructive/15 text-destructive' },
};

interface RowState {
  selected: boolean;
  classroomId: string;
  repeatingGrade: boolean;
}

const selectCls =
  'text-xs rounded-xl border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

export const RolloverModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { data: years = [] } = useAcademicYears();
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [fromClassroomId, setFromClassroomId] = useState('');
  const [state, setState] = useState<Record<string, RowState>>({});
  const [result, setResult] = useState<RolloverResult | null>(null);
  const rollover = useRollover();

  // Por defecto: desde el año vigente hacia el año con matrícula abierta (o el siguiente)
  useEffect(() => {
    if (!isOpen || years.length === 0) return;
    const active = years.find((y) => y.isActive);
    const target = pickEnrollmentTargetYear(years);
    setFromId((prev) => prev || active?.id || '');
    setToId((prev) => prev || target?.id || '');
  }, [isOpen, years]);

  useEffect(() => {
    if (isOpen) setResult(null);
  }, [isOpen]);

  const { data, isLoading, isError } = useRolloverCandidates(
    {
      fromAcademicYearId: fromId || undefined,
      toAcademicYearId: toId || undefined,
      classroomId: fromClassroomId || undefined,
    },
    isOpen,
  );

  useEffect(() => {
    if (!data) return;
    const next: Record<string, RowState> = {};
    for (const r of data.rows) {
      next[r.student.id] = {
        selected: r.selectedByDefault,
        classroomId: r.proposedClassroomId ?? '',
        repeatingGrade: r.repeatingGrade,
      };
    }
    setState(next);
  }, [data]);

  // Aulas de origen: las que tienen alumnos en el año de origen (de la lista completa al no filtrar)
  const [fromClassrooms, setFromClassrooms] = useState<RolloverRow['fromClassroom'][]>([]);
  useEffect(() => {
    if (data && !fromClassroomId) {
      const map = new Map(data.rows.map((r) => [r.fromClassroom.id, r.fromClassroom]));
      setFromClassrooms([...map.values()]);
    }
  }, [data, fromClassroomId]);

  const rows = data?.rows ?? [];
  const selectedRows = rows.filter((r) => state[r.student.id]?.selected);
  const missingClassroom = selectedRows.filter((r) => !state[r.student.id]?.classroomId).length;

  // Ocupación proyectada de cada aula destino
  const projected = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of data?.classrooms ?? []) map.set(c.id, c.enrolledInTarget);
    for (const r of selectedRows) {
      const id = state[r.student.id]?.classroomId;
      if (id) map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  }, [data, selectedRows, state]);
  const overCapacity = (data?.classrooms ?? []).filter(
    (c) =>
      (projected.get(c.id) ?? 0) > c.capacity && selectedRows.some((r) => state[r.student.id]?.classroomId === c.id),
  );

  const update = (studentId: string, patch: Partial<RowState>) =>
    setState((s) => ({ ...s, [studentId]: { ...s[studentId], ...patch } }));
  const selectableRows = rows.filter((r) => r.selectable);
  const allSelected = selectableRows.length > 0 && selectableRows.every((r) => state[r.student.id]?.selected);
  const toggleAll = () => {
    const value = !allSelected;
    setState((s) => {
      const next = { ...s };
      for (const r of selectableRows)
        next[r.student.id] = { ...next[r.student.id], selected: value && !!next[r.student.id].classroomId };
      return next;
    });
  };

  const submit = () => {
    if (!data) return;
    rollover.mutate(
      {
        toAcademicYearId: data.toYear.id,
        items: selectedRows.map((r) => ({
          studentId: r.student.id,
          classroomId: state[r.student.id].classroomId,
          condition: 'CONTINUO',
          repeatingGrade: state[r.student.id].repeatingGrade,
        })),
      },
      {
        onSuccess: (res) => {
          setResult(res);
          if (res.failed === 0) toast.success(`${res.enrolled} alumnos matriculados en ${res.year}.`);
          else toast.warning(`${res.enrolled} matriculados, ${res.failed} con error.`);
        },
        onError: (err: any) => toast.error(getApiErrorMessage(err, 'No se pudo completar la re-matrícula.')),
      },
    );
  };

  const fromYear = years.find((y) => y.id === fromId);
  const toYear = years.find((y) => y.id === toId);
  const counts = {
    already: rows.filter((r) => r.flags.includes('ALREADY_ENROLLED')).length,
    debt: rows.filter((r) => r.overdueDebt > 0).length,
    declined: rows.filter((r) => r.ratification === 'DECLINED').length,
    graduates: rows.filter((r) => r.flags.includes('GRADUATES')).length,
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`Re-matrícula ${toYear ? `al año ${toYear.year}` : ''}`}
      description="Pasa a los alumnos del año vigente al siguiente sin volver a llenar la ficha. Cada matrícula genera su cronograma de cuotas con el tarifario del año destino."
      size="xl"
      footer={
        result ? (
          <Button size="sm" onClick={onClose}>
            Listo
          </Button>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={selectedRows.length === 0 || missingClassroom > 0}
              isLoading={rollover.isPending}
              onClick={submit}
              className="gap-1.5"
            >
              <Repeat2 className="w-3.5 h-3.5" />
              Matricular {selectedRows.length} {selectedRows.length === 1 ? 'alumno' : 'alumnos'}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Matriculados" value={result.enrolled} tone="ok" />
            <Stat label="Con error" value={result.failed} tone={result.failed ? 'bad' : 'muted'} />
            <Stat label="Cuotas generadas" value={result.cuotas} tone="muted" />
            <Stat
              label="Sin tarifario"
              value={result.withoutFeeSchedule}
              tone={result.withoutFeeSchedule ? 'warn' : 'muted'}
            />
          </div>
          {result.withoutFeeSchedule > 0 && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-300">
              {result.withoutFeeSchedule} matrículas quedaron sin cuotas porque su nivel no tiene tarifario en{' '}
              {result.year}. Configúralo en Tesorería → Tarifario y usa <strong>Generar cuotas faltantes</strong>.
            </p>
          )}
          <ul className="divide-y divide-border/60 rounded-xl border border-border max-h-72 overflow-y-auto">
            {result.results.map((r) => (
              <li key={r.studentId} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="flex items-center gap-2 font-semibold text-foreground">
                  {r.ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-destructive" />
                  )}
                  {r.name}
                </span>
                <span className={`text-right ${r.ok ? 'text-muted-foreground' : 'text-destructive'}`}>
                  {r.ok ? (r.cuotas ? `${r.cuotas} cuotas · ${soles(r.total ?? 0)}` : 'Sin cuotas') : r.error}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="space-y-4 text-xs">
          <div className="flex flex-wrap items-end gap-2">
            <label className="space-y-1">
              <span className="block font-semibold">Desde</span>
              <select
                className={selectCls}
                value={fromId}
                onChange={(e) => {
                  setFromId(e.target.value);
                  setFromClassroomId('');
                }}
              >
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.year}
                    {y.isActive ? ' (vigente)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <ArrowRight className="w-4 h-4 mb-2.5 text-muted-foreground" />
            <label className="space-y-1">
              <span className="block font-semibold">Hacia</span>
              <select className={selectCls} value={toId} onChange={(e) => setToId(e.target.value)}>
                <option value="">-- Año destino --</option>
                {years
                  .filter((y) => y.id !== fromId)
                  .map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.year}
                      {y.enrollmentOpen ? ' (matrícula abierta)' : y.isActive ? ' (vigente)' : ''}
                    </option>
                  ))}
              </select>
            </label>
            <label className="space-y-1 flex-1 min-w-[180px]">
              <span className="block font-semibold">Aula de origen</span>
              <select
                className={`${selectCls} w-full`}
                value={fromClassroomId}
                onChange={(e) => setFromClassroomId(e.target.value)}
              >
                <option value="">Todas las aulas</option>
                {fromClassrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {classroomLabel(c)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!toId ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-center text-muted-foreground">
              Crea el año siguiente en <strong>Años lectivos</strong> y ábrele la matrícula para empezar.
            </p>
          ) : isLoading ? (
            <div className="p-10 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Cargando alumnos de {fromYear?.year}...
            </div>
          ) : isError ? (
            <p className="text-destructive">No se pudo cargar la lista.</p>
          ) : rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
              No hay alumnos matriculados en {fromYear?.year}.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Chip>
                  {rows.length} alumnos en {data?.fromYear.year}
                </Chip>
                <Chip tone="primary">{selectedRows.length} seleccionados</Chip>
                {counts.already > 0 && (
                  <Chip tone="ok">
                    {counts.already} ya matriculados en {data?.toYear.year}
                  </Chip>
                )}
                {counts.graduates > 0 && <Chip>{counts.graduates} egresan</Chip>}
                {counts.declined > 0 && <Chip tone="bad">{counts.declined} no continúan</Chip>}
                {counts.debt > 0 && <Chip tone="warn">{counts.debt} con deuda vencida</Chip>}
              </div>
              {overCapacity.length > 0 && (
                <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Supera la capacidad:{' '}
                  {overCapacity.map((c) => `${classroomLabel(c)} (${projected.get(c.id)}/${c.capacity})`).join(', ')}.
                </p>
              )}
              <div className="rounded-xl border border-border overflow-x-auto max-h-[50vh] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-muted/90 backdrop-blur text-xs font-extrabold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    <tr>
                      <th className="px-3 py-2 w-8">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAll}
                          aria-label="Seleccionar todos"
                          className="w-4 h-4 rounded"
                        />
                      </th>
                      <th className="px-3 py-2">Alumno</th>
                      <th className="px-3 py-2">{data?.fromYear.year}</th>
                      <th className="px-3 py-2">Aula {data?.toYear.year}</th>
                      <th className="px-3 py-2 text-center">Repite</th>
                      <th className="px-3 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {rows.map((r) => {
                      const st = state[r.student.id];
                      if (!st) return null;
                      const name = `${r.student.lastNamePaternal} ${r.student.lastNameMaternal ?? ''}, ${r.student.firstNames}`;
                      return (
                        <tr
                          key={r.student.id}
                          className={`${r.selectable ? 'hover:bg-muted/20' : 'opacity-60'} transition-colors`}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={st.selected}
                              disabled={!r.selectable}
                              onChange={(e) => update(r.student.id, { selected: e.target.checked })}
                              aria-label={`Seleccionar ${name}`}
                              className="w-4 h-4 rounded"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-bold text-foreground whitespace-nowrap">{name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{r.student.documentId}</div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                            {classroomLabel(r.fromClassroom)}
                          </td>
                          <td className="px-3 py-2">
                            {r.enrolledInTarget ? (
                              <span className="whitespace-nowrap text-emerald-700 dark:text-emerald-400 font-semibold">
                                {classroomLabel(r.enrolledInTarget)}
                              </span>
                            ) : r.step.kind === 'GRADUATE' ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <select
                                className={`${selectCls} py-1.5 min-w-[170px] ${st.selected && !st.classroomId ? 'border-destructive' : ''}`}
                                value={st.classroomId}
                                disabled={!r.selectable}
                                onChange={(e) =>
                                  update(r.student.id, {
                                    classroomId: e.target.value,
                                    selected: !!e.target.value || st.selected,
                                  })
                                }
                              >
                                <option value="">-- Elige aula --</option>
                                {data?.classrooms.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {classroomLabel(c)} ({projected.get(c.id) ?? 0}/{c.capacity})
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={st.repeatingGrade}
                              disabled={!r.selectable}
                              onChange={(e) => update(r.student.id, { repeatingGrade: e.target.checked })}
                              aria-label="Repite el grado"
                              className="w-4 h-4 rounded"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {r.flags.map((f) =>
                                f === 'DEBT' ? (
                                  <span
                                    key={f}
                                    className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 whitespace-nowrap"
                                  >
                                    Debe {soles(r.overdueDebt)}
                                  </span>
                                ) : FLAG[f] ? (
                                  <span
                                    key={f}
                                    className={`px-1.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${FLAG[f]!.cls}`}
                                  >
                                    {FLAG[f]!.label}
                                  </span>
                                ) : null,
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                El aula propuesta es el grado siguiente en la misma sección y turno, entre las secciones abiertas en{' '}
                {data?.toYear.year}. Quien tiene situación final "permanece" se propone repitiendo; si falta la
                situación final, regístrala en <strong>Años lectivos</strong> o marca <strong>Repite</strong> y cambia
                su aula. La deuda no bloquea la matrícula: se muestra para que Dirección decida.
              </p>
            </>
          )}
        </div>
      )}
    </Modal>
  );
};

const Chip: React.FC<{ children: React.ReactNode; tone?: 'ok' | 'bad' | 'warn' | 'primary' }> = ({
  children,
  tone,
}) => {
  const cls =
    tone === 'ok'
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
      : tone === 'bad'
        ? 'bg-destructive/15 text-destructive'
        : tone === 'warn'
          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
          : tone === 'primary'
            ? 'bg-primary/10 text-primary'
            : 'bg-secondary text-secondary-foreground';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>{children}</span>;
};

const Stat: React.FC<{ label: string; value: number; tone: 'ok' | 'bad' | 'warn' | 'muted' }> = ({
  label,
  value,
  tone,
}) => (
  <div className="rounded-xl border border-border p-3">
    <div
      className={`text-xl font-black ${
        tone === 'ok'
          ? 'text-emerald-600'
          : tone === 'bad'
            ? 'text-destructive'
            : tone === 'warn'
              ? 'text-amber-600'
              : 'text-foreground'
      }`}
    >
      {value}
    </div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
);
