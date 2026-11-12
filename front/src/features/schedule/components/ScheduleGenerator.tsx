import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, Loader2, Plus, RefreshCw, Save, Sparkles, Trash2, UserX, Wand2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/features/academic/api';
import { SHORT_DAYS } from '../api/useSchedule';
import {
  LEVEL_NAME,
  useApplyGeneration,
  useGenerate,
  useGeneratorSetup,
  useSaveAvailability,
  useSavePlanCourse,
  useSaveTemplate,
  type GenerationResult,
  type GeneratorSetup,
  type Level,
  type TemplateSlot,
} from '../api/useScheduleGenerator';
import { WeeklySchedule } from './WeeklySchedule';

const Step: React.FC<{ n: number; title: string; subtitle: string; open: boolean; onToggle: () => void; done?: boolean; children: React.ReactNode }> = ({
  n,
  title,
  subtitle,
  open,
  onToggle,
  done,
  children,
}) => (
  <Card className="overflow-hidden">
    <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40" aria-expanded={open}>
      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', done ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-primary/10 text-primary')}>
        {done ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : n}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden />
    </button>
    {open && <div className="border-t border-border p-4">{children}</div>}
  </Card>
);

// ------------------------------------------------------------------ 1. Jornada

const TemplateEditor: React.FC<{ level: GeneratorSetup['levels'][number] }> = ({ level }) => {
  const save = useSaveTemplate();
  const [days, setDays] = useState(level.days);
  const [slots, setSlots] = useState<TemplateSlot[]>(level.slots);
  useEffect(() => {
    setDays(level.days);
    setSlots(level.slots);
  }, [level]);
  const set = (i: number, patch: Partial<TemplateSlot>) => setSlots(slots.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addRow = () => {
    const last = slots[slots.length - 1];
    const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
    const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const start = last?.end ?? '08:00';
    setSlots([...slots, { start, end: fmt(Math.min(toMin(start) + 45, 23 * 60 + 59)), kind: 'CLASS' }]);
  };
  const classCount = slots.filter((s) => s.kind === 'CLASS').length;

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          {LEVEL_NAME[level.level]}{' '}
          <span className="text-xs font-normal text-muted-foreground">
            · {classCount} horas al día × {days.length} días = {classCount * days.length} horas semanales {level.custom ? '' : '(sugerida)'}
          </span>
        </p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6].map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={days.includes(d)}
              onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort())}
              className={cn('rounded-md border px-2 py-1 text-[11px] font-semibold', days.includes(d) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground')}
            >
              {SHORT_DAYS[d]}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        {slots.map((s, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <span className="w-6 text-right text-[11px] text-muted-foreground">{i + 1}</span>
            <Input type="time" className="h-8 w-28" value={s.start} onChange={(e) => set(i, { start: e.target.value })} aria-label={`Inicio fila ${i + 1}`} />
            <Input type="time" className="h-8 w-28" value={s.end} onChange={(e) => set(i, { end: e.target.value })} aria-label={`Fin fila ${i + 1}`} />
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              value={s.kind}
              onChange={(e) => set(i, { kind: e.target.value as TemplateSlot['kind'], label: e.target.value === 'BREAK' ? s.label || 'Recreo' : undefined })}
              aria-label={`Tipo fila ${i + 1}`}
            >
              <option value="CLASS">Hora de clase</option>
              <option value="BREAK">Recreo / refrigerio</option>
            </select>
            {s.kind === 'BREAK' && <Input className="h-8 w-32" value={s.label ?? ''} maxLength={30} onChange={(e) => set(i, { label: e.target.value })} aria-label={`Nombre fila ${i + 1}`} />}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSlots(slots.filter((_, idx) => idx !== i))} aria-label={`Quitar fila ${i + 1}`}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={addRow}>
          <Plus className="h-3.5 w-3.5" aria-hidden /> Agregar fila
        </Button>
        <Button
          size="sm"
          className="gap-1.5"
          disabled={save.isPending}
          onClick={() => save.mutate({ level: level.level, days, slots }, { onSuccess: () => toast.success(`Jornada de ${LEVEL_NAME[level.level]} guardada`), onError: (e) => toast.error(apiErrorMessage(e)) })}
        >
          <Save className="h-3.5 w-3.5" aria-hidden /> Guardar jornada
        </Button>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ 2. Horas y preferencias

const PlanCoursesEditor: React.FC<{ setup: GeneratorSetup }> = ({ setup }) => {
  const save = useSavePlanCourse();
  // El plan es por grado: se agrupan las secciones del mismo grado
  const groups = useMemo(() => {
    const map = new Map<string, { title: string; courses: GeneratorSetup['classrooms'][number]['courses'] }>();
    for (const c of setup.classrooms) {
      const key = `${c.level}-${c.grade}`;
      if (!map.has(key)) map.set(key, { title: `${c.level === 'INITIAL' ? `${c.grade} años` : `${c.grade}.°`} de ${LEVEL_NAME[c.level]}`, courses: [] });
      const g = map.get(key)!;
      for (const course of c.courses) if (!g.courses.some((x) => x.studyPlanCourseId && x.studyPlanCourseId === course.studyPlanCourseId)) g.courses.push(course);
    }
    return [...map.entries()];
  }, [setup]);
  const [openKey, setOpenKey] = useState<string | null>(groups[0]?.[0] ?? null);

  const patch = (id: string | null, data: { weeklyHours?: number | null; preferDoubleBlock?: boolean; maxHoursPerDay?: number; preferEarly?: boolean }) => {
    if (!id) return toast.error('Este curso no está en el plan de estudios del grado. Agrégalo primero en “Plan de estudios”.');
    save.mutate({ id, ...data }, { onError: (e) => toast.error(apiErrorMessage(e)) });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Son las horas del plan de estudios (valen para todas las secciones del grado). Por defecto: bloques de 2 horas y máximo 2 horas del curso por día, así 3 h quedan como 2 + 1 en días distintos.
      </p>
      {groups.map(([key, g]) => {
        const total = g.courses.reduce((s, c) => s + (c.hours ?? 0), 0);
        const missing = g.courses.filter((c) => c.hours === null).length;
        return (
          <div key={key} className="rounded-xl border border-border">
            <button type="button" onClick={() => setOpenKey(openKey === key ? null : key)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm">
              <span className="font-medium text-foreground">{g.title}</span>
              <span className={cn('text-xs', missing ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground')}>
                {total} h/semana{missing ? ` · ${missing} curso(s) sin horas` : ''}
              </span>
            </button>
            {openKey === key && (
              <div className="overflow-x-auto border-t border-border">
                <table className="w-full min-w-[560px] text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left font-medium">Curso</th>
                      <th scope="col" className="px-2 py-2 font-medium">Horas/sem.</th>
                      <th scope="col" className="px-2 py-2 font-medium">Bloques dobles</th>
                      <th scope="col" className="px-2 py-2 font-medium">Máx. por día</th>
                      <th scope="col" className="px-2 py-2 font-medium">Primeras horas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {g.courses.map((c) => (
                      <tr key={c.assignmentId}>
                        <td className="px-3 py-1.5">
                          <p className="font-medium text-foreground">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground">{c.teacherName}</p>
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <Input
                            type="number"
                            min={0}
                            max={40}
                            defaultValue={c.hours ?? ''}
                            placeholder="—"
                            className={cn('mx-auto h-8 w-16 text-center', c.hours === null && 'border-amber-500')}
                            onBlur={(e) => {
                              const v = e.target.value === '' ? null : Number(e.target.value);
                              if (v !== c.hours) patch(c.studyPlanCourseId, { weeklyHours: v });
                            }}
                            aria-label={`Horas semanales de ${c.name}`}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <input type="checkbox" checked={c.preferDoubleBlock} onChange={(e) => patch(c.studyPlanCourseId, { preferDoubleBlock: e.target.checked })} aria-label={`Bloques dobles en ${c.name}`} />
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <select
                            className="h-8 rounded-md border border-input bg-background px-1.5"
                            value={c.maxHoursPerDay}
                            onChange={(e) => patch(c.studyPlanCourseId, { maxHoursPerDay: Number(e.target.value) })}
                            aria-label={`Máximo por día de ${c.name}`}
                          >
                            {[1, 2, 3, 4].map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <input type="checkbox" checked={c.preferEarly} onChange={(e) => patch(c.studyPlanCourseId, { preferEarly: e.target.checked })} aria-label={`Primeras horas para ${c.name}`} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ------------------------------------------------------------------ 3. Disponibilidad

const AvailabilityEditor: React.FC<{ setup: GeneratorSetup }> = ({ setup }) => {
  const save = useSaveAvailability();
  const [teacherId, setTeacherId] = useState(setup.teachers[0]?.id ?? '');
  const teacher = setup.teachers.find((t) => t.id === teacherId);
  const [marked, setMarked] = useState<Set<string>>(new Set(teacher?.unavailable ?? []));
  useEffect(() => setMarked(new Set(teacher?.unavailable ?? [])), [teacher]);

  // Filas: horas de clase de todas las jornadas (sin repetir)
  const rows = useMemo(() => {
    const map = new Map<string, { start: string; end: string }>();
    for (const l of setup.levels) for (const s of l.slots) if (s.kind === 'CLASS') map.set(`${s.start}|${s.end}`, { start: s.start, end: s.end });
    return [...map.values()].sort((a, b) => a.start.localeCompare(b.start));
  }, [setup]);
  const days = useMemo(() => [...new Set(setup.levels.flatMap((l) => l.days))].sort(), [setup]);
  const toggle = (key: string) => setMarked((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  if (!setup.teachers.length) return <p className="text-sm text-muted-foreground">Aún no hay docentes con carga asignada.</p>;
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Marca las horas en que el docente NO puede dictar (por ejemplo, si trabaja en otro colegio). Si no marcas nada, se asume que está disponible toda la jornada.</p>
      <select className="h-9 w-full max-w-sm rounded-md border border-input bg-background px-2 text-sm" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} aria-label="Docente">
        {setup.teachers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} · {t.hours} h{t.unavailable.length ? ` · ${t.unavailable.length} bloque(s) no disponible(s)` : ''}
          </option>
        ))}
      </select>
      <div className="overflow-x-auto">
        <table className="text-xs">
          <thead>
            <tr>
              <th scope="col" className="px-2 py-1 text-left font-medium text-muted-foreground">Hora</th>
              {days.map((d) => (
                <th key={d} scope="col" className="px-1 py-1 font-medium text-muted-foreground">{SHORT_DAYS[d]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.start}>
                <td className="whitespace-nowrap px-2 py-0.5 font-mono text-[11px] text-muted-foreground">{r.start}–{r.end}</td>
                {days.map((d) => {
                  const key = `${d}|${r.start}|${r.end}`;
                  const off = marked.has(key);
                  return (
                    <td key={d} className="px-1 py-0.5">
                      <button
                        type="button"
                        onClick={() => toggle(key)}
                        aria-pressed={off}
                        aria-label={`${SHORT_DAYS[d]} ${r.start}: ${off ? 'no disponible' : 'disponible'}`}
                        className={cn('flex h-7 w-12 items-center justify-center rounded-md border', off ? 'border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300' : 'border-border bg-emerald-500/5 text-emerald-700/60 dark:text-emerald-300/60')}
                      >
                        {off ? <UserX className="h-3.5 w-3.5" /> : '✓'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        size="sm"
        className="gap-1.5"
        disabled={save.isPending || !teacherId}
        onClick={() => save.mutate({ teacherId, unavailable: [...marked] }, { onSuccess: () => toast.success('Disponibilidad guardada'), onError: (e) => toast.error(apiErrorMessage(e)) })}
      >
        <Save className="h-3.5 w-3.5" aria-hidden /> Guardar disponibilidad
      </Button>
    </div>
  );
};

// ------------------------------------------------------------------ 4. Generar y aplicar

const GenerateStep: React.FC<{ setup: GeneratorSetup }> = ({ setup }) => {
  const generate = useGenerate();
  const apply = useApplyGeneration();
  const [selected, setSelected] = useState<Set<string>>(new Set(setup.classrooms.map((c) => c.id)));
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [seed, setSeed] = useState(1);
  const [viewId, setViewId] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);

  const replacing = setup.classrooms.filter((c) => selected.has(c.id) && c.hasSchedule).length;
  const run = (nextSeed: number) => {
    setSeed(nextSeed);
    setConflicts([]);
    generate.mutate(
      { classroomIds: [...selected], seed: nextSeed },
      {
        onSuccess: (r) => {
          setResult(r);
          setViewId(r.proposal[0]?.classroomId ?? null);
        },
        onError: (e) => toast.error(apiErrorMessage(e)),
      },
    );
  };

  const doApply = () => {
    if (!result) return;
    if (replacing && !window.confirm(`Se reemplazará el horario actual de ${replacing} aula(s). ¿Continuar?`)) return;
    apply.mutate(
      result.proposal.map((p) => ({ classroomId: p.classroomId, blocks: p.blocks })),
      {
        onSuccess: () => {
          toast.success('Horarios guardados. Las familias y docentes ya los ven.');
          setResult(null);
        },
        onError: (e: unknown) => {
          const res = (e as { response?: { status?: number; data?: { data?: { conflicts?: string[] } } } }).response;
          if (res?.status === 409 && res.data?.data?.conflicts) setConflicts(res.data.data.conflicts);
          else toast.error(apiErrorMessage(e));
        },
      },
    );
  };

  const byLevel = useMemo(() => {
    const map = new Map<Level, GeneratorSetup['classrooms']>();
    for (const c of setup.classrooms) map.set(c.level, [...(map.get(c.level) ?? []), c]);
    return [...map.entries()];
  }, [setup]);
  const view = result?.proposal.find((p) => p.classroomId === viewId);
  const totalMissing = result?.unplaced.reduce((s, u) => s + u.missingHours, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Aulas a generar:</span>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelected(new Set(setup.classrooms.map((c) => c.id)))}>Todas</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelected(new Set())}>Ninguna</Button>
        </div>
        {byLevel.map(([level, list]) => (
          <div key={level}>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{LEVEL_NAME[level]}</p>
            <div className="flex flex-wrap gap-1.5">
              {list.map((c) => {
                const on = selected.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSelected((prev) => {
                      const next = new Set(prev);
                      if (on) next.delete(c.id);
                      else next.add(c.id);
                      return next;
                    })}
                    className={cn('rounded-lg border px-2.5 py-1 text-xs', on ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground')}
                  >
                    {c.label.replace(/ de (Inicial|Primaria|Secundaria)$/, '').replace(/ \((Inicial)\)$/, '')}
                    {c.hasSchedule && <span className="ml-1 text-[10px] opacity-70">(tiene horario)</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <p className="text-[11px] text-muted-foreground">
          Las aulas que no elijas conservan su horario y el generador lo respeta (sus docentes se consideran ocupados en esas horas).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => run(1)} disabled={!selected.size || generate.isPending} className="gap-2">
          {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Wand2 className="h-4 w-4" aria-hidden />}
          Generar propuesta
        </Button>
        {result && (
          <Button variant="outline" onClick={() => run(seed + 1)} disabled={generate.isPending} className="gap-2">
            <RefreshCw className="h-4 w-4" aria-hidden /> Otra versión
          </Button>
        )}
      </div>

      {result && (
        <div className="space-y-3">
          <div className={cn('rounded-xl border p-3 text-sm', totalMissing ? 'border-amber-500/40 bg-amber-500/5' : 'border-emerald-500/40 bg-emerald-500/5')}>
            <p className="flex items-center gap-2 font-semibold text-foreground">
              {totalMissing ? <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden /> : <Sparkles className="h-4 w-4 text-emerald-600" aria-hidden />}
              {totalMissing ? `Propuesta casi completa: faltan ${totalMissing} hora(s) por ubicar` : 'Propuesta completa, sin cruces de docentes'}
              <span className="text-xs font-normal text-muted-foreground">({result.elapsedMs} ms)</span>
            </p>
            {result.unplaced.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-foreground">
                {result.unplaced.map((u) => (
                  <li key={`${u.classroomId}-${u.assignmentId}`}>
                    <strong>{u.classroomLabel} · {u.courseName}</strong>: faltan {u.missingHours} h. {u.reason}
                  </li>
                ))}
              </ul>
            )}
            {result.warnings.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                {result.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
            {totalMissing > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">Puedes aplicarla así y completar a mano en “Por aula”, probar otra versión, o revisar la disponibilidad y las horas.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {result.proposal.map((p) => (
              <button
                key={p.classroomId}
                type="button"
                onClick={() => setViewId(p.classroomId)}
                aria-pressed={viewId === p.classroomId}
                className={cn('rounded-lg border px-2.5 py-1 text-xs', viewId === p.classroomId ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:bg-muted')}
              >
                {p.label} <span className="opacity-75">{p.placedHours}/{p.requiredHours} h</span>
              </button>
            ))}
          </div>
          {view && <WeeklySchedule blocks={view.blocks} />}

          {conflicts.length > 0 && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
              <p className="mb-1 font-semibold text-foreground">Alguien cambió horarios mientras tanto; genera de nuevo:</p>
              <ul className="list-disc pl-5">{conflicts.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
          )}

          <div className="sticky bottom-4 z-10 flex justify-end">
            <Button onClick={doApply} disabled={apply.isPending} className="gap-2 shadow-lg">
              {apply.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
              Aplicar a {result.proposal.length} aula(s)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/** Asistente de armado automático de horarios (Dirección). */
export const ScheduleGenerator: React.FC = () => {
  const { data: setup, isLoading } = useGeneratorSetup();
  const [open, setOpen] = useState<number>(4);
  if (isLoading || !setup) return <Skeleton className="h-64 w-full rounded-xl" />;

  const coursesWithoutHours = setup.classrooms.flatMap((c) => c.courses).filter((c) => c.hours === null).length;
  const toggle = (n: number) => setOpen(open === n ? 0 : n);

  return (
    <div className="space-y-3">
      <Card className="flex items-start gap-3 border-primary/20 bg-primary/5 p-4">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <p className="text-sm text-foreground">
          El sistema arma el horario de todas las aulas respetando las horas del plan, sin que ningún docente quede en dos aulas a la vez. Revisa los pasos 1 a 3 (ya vienen con valores sugeridos) y genera. La propuesta no se guarda hasta que la apliques.
        </p>
      </Card>
      <Step n={1} title="Jornada escolar" subtitle="Horas pedagógicas y recreos de cada nivel" open={open === 1} onToggle={() => toggle(1)} done={setup.levels.every((l) => l.custom)}>
        <div className="space-y-3">
          {setup.levels.map((l) => (
            <TemplateEditor key={l.level} level={l} />
          ))}
        </div>
      </Step>
      <Step
        n={2}
        title="Horas por curso"
        subtitle={coursesWithoutHours ? `${coursesWithoutHours} curso(s) sin horas semanales` : 'Horas semanales y cómo repartirlas'}
        open={open === 2}
        onToggle={() => toggle(2)}
        done={coursesWithoutHours === 0}
      >
        <PlanCoursesEditor setup={setup} />
      </Step>
      <Step n={3} title="Disponibilidad de docentes" subtitle="Opcional: horas en que algún docente no puede dictar" open={open === 3} onToggle={() => toggle(3)}>
        <AvailabilityEditor setup={setup} />
      </Step>
      <Step n={4} title="Generar y aplicar" subtitle="Elige las aulas, revisa la propuesta y guárdala" open={open === 4} onToggle={() => toggle(4)}>
        <GenerateStep setup={setup} />
      </Step>
    </div>
  );
};
