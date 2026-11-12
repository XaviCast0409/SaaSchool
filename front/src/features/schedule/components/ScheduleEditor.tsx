import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Copy, Loader2, Plus, Save, Undo2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/features/academic/api';
import { DAY_NAMES, SHORT_DAYS, useClassroomSchedule, useSaveClassroomSchedule, type ScheduleBlock } from '../api/useSchedule';
import { WeeklySchedule } from './WeeklySchedule';

const BREAK = '__break__';

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const fromMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const overlap = (a: ScheduleBlock, b: ScheduleBlock) => a.dayOfWeek === b.dayOfWeek && a.startTime < b.endTime && b.startTime < a.endTime;

/** Editor del horario semanal de un aula (Dirección). Los cambios se guardan juntos al final. */
export const ScheduleEditor: React.FC<{ classroomId: string; canEdit: boolean }> = ({ classroomId, canEdit }) => {
  const { data, isLoading } = useClassroomSchedule(classroomId);
  const save = useSaveClassroomSchedule(classroomId);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [dirty, setDirty] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [form, setForm] = useState({ days: [1] as number[], startTime: '08:00', endTime: '08:45', course: '', label: 'Recreo', room: '' });

  useEffect(() => {
    if (data) {
      setBlocks(data.blocks);
      setDirty(false);
      setConflicts([]);
    }
  }, [data]);

  const courseOf = useMemo(() => new Map((data?.courses ?? []).map((c) => [c.id, c])), [data]);

  // Al elegir hora de inicio, sugerir el siguiente bloque contiguo del día
  const suggestNext = (day: number) => {
    const last = blocks.filter((b) => b.dayOfWeek === day).sort((a, b) => b.endTime.localeCompare(a.endTime))[0];
    if (!last) return;
    const duration = toMin(form.endTime) - toMin(form.startTime) || 45;
    setForm((f) => ({ ...f, startTime: last.endTime, endTime: fromMin(Math.min(toMin(last.endTime) + duration, 23 * 60 + 59)) }));
  };

  const update = (next: ScheduleBlock[]) => {
    setBlocks(next);
    setDirty(true);
    setConflicts([]);
  };

  const addBlocks = () => {
    if (form.days.length === 0) return toast.error('Elige al menos un día.');
    if (form.startTime >= form.endTime) return toast.error('La hora de fin debe ser posterior a la de inicio.');
    if (!form.course) return toast.error('Elige el curso o “Recreo / libre”.');
    const isBreak = form.course === BREAK;
    const course = isBreak ? null : courseOf.get(form.course);
    const created: ScheduleBlock[] = form.days.map((d) => ({
      dayOfWeek: d,
      startTime: form.startTime,
      endTime: form.endTime,
      courseAssignmentId: isBreak ? null : form.course,
      label: isBreak ? form.label.trim() || 'Recreo' : null,
      room: form.room.trim() || null,
      courseName: course?.name ?? null,
      teacherName: course?.teacherName ?? null,
    }));
    const clash = created.find((c) => blocks.some((b) => overlap(b, c)));
    if (clash) return toast.error(`${DAY_NAMES[clash.dayOfWeek]}: ya hay un bloque en ese horario.`);
    update([...blocks, ...created]);
    // Preparar el siguiente bloque contiguo
    const duration = toMin(form.endTime) - toMin(form.startTime);
    setForm((f) => ({ ...f, startTime: f.endTime, endTime: fromMin(Math.min(toMin(f.endTime) + duration, 23 * 60 + 59)) }));
  };

  const copyMondayToWeek = () => {
    const monday = blocks.filter((b) => b.dayOfWeek === 1);
    if (monday.length === 0) return toast.error('Primero arma el lunes.');
    if (blocks.some((b) => b.dayOfWeek > 1) && !window.confirm('Esto reemplaza martes a viernes con la estructura del lunes. ¿Continuar?')) return;
    const copies = [2, 3, 4, 5].flatMap((d) => monday.map((b) => ({ ...b, id: undefined, dayOfWeek: d })));
    update([...monday, ...copies, ...blocks.filter((b) => b.dayOfWeek === 6)]);
    toast.success('Estructura del lunes copiada. Ahora cambia los cursos de cada día.');
  };

  const onSave = (allowTeacherConflicts = false) => {
    save.mutate(
      { blocks, allowTeacherConflicts },
      {
        onSuccess: (r) => {
          toast.success(`Horario guardado (${r.saved} bloques).`);
          setConflicts([]);
        },
        onError: (e: unknown) => {
          const res = (e as { response?: { status?: number; data?: { data?: { conflicts?: string[] } } } }).response;
          if (res?.status === 409 && res.data?.data?.conflicts) setConflicts(res.data.data.conflicts);
          else toast.error(apiErrorMessage(e));
        },
      },
    );
  };

  // Al hacer clic en un bloque, cargarlo en el formulario para cambiar el curso (se reemplaza al agregar)
  const pick = (i: number) => {
    const b = blocks[i];
    setForm({
      days: [b.dayOfWeek],
      startTime: b.startTime,
      endTime: b.endTime,
      course: b.courseAssignmentId ?? BREAK,
      label: b.label ?? 'Recreo',
      room: b.room ?? '',
    });
    update(blocks.filter((_, idx) => idx !== i));
    toast.info('Bloque cargado en el formulario: ajústalo y pulsa “Agregar”.');
  };

  if (isLoading || !data) return <Skeleton className="h-64 w-full rounded-xl" />;

  const select = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground';

  return (
    <div className="space-y-4">
      {canEdit && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Agregar bloque · {data.classroom.label}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            <fieldset className="col-span-2 md:col-span-6">
              <legend className="mb-1 text-xs text-muted-foreground">Días</legend>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5, 6].map((d) => {
                  const on = form.days.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        const days = on ? form.days.filter((x) => x !== d) : [...form.days, d].sort();
                        setForm({ ...form, days });
                        if (!on && days.length === 1) suggestNext(d);
                      }}
                      className={cn('rounded-lg border px-3 py-1.5 text-xs font-semibold', on ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted')}
                    >
                      {SHORT_DAYS[d]}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <label className="text-xs text-muted-foreground">
              Inicio
              <Input type="time" className="h-9" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </label>
            <label className="text-xs text-muted-foreground">
              Fin
              <Input type="time" className="h-9" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </label>
            <label className="col-span-2 text-xs text-muted-foreground">
              Curso
              <select className={select} value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })}>
                <option value="">Elegir…</option>
                {data.courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.teacherName ? ` · ${c.teacherName}` : ''}
                  </option>
                ))}
                <option value={BREAK}>Recreo / bloque libre</option>
              </select>
            </label>
            {form.course === BREAK ? (
              <label className="text-xs text-muted-foreground">
                Nombre
                <Input className="h-9" value={form.label} maxLength={40} onChange={(e) => setForm({ ...form, label: e.target.value })} />
              </label>
            ) : (
              <label className="text-xs text-muted-foreground">
                Ambiente (opcional)
                <Input className="h-9" placeholder="Lab., Patio…" value={form.room} maxLength={60} onChange={(e) => setForm({ ...form, room: e.target.value })} />
              </label>
            )}
            <div className="col-span-2 flex flex-wrap items-end gap-2 md:col-span-6">
              <Button type="button" onClick={addBlocks} className="gap-1.5">
                <Plus className="h-4 w-4" aria-hidden /> Agregar
              </Button>
              <Button type="button" variant="outline" onClick={copyMondayToWeek} className="gap-1.5">
                <Copy className="h-4 w-4" aria-hidden /> Copiar estructura del lunes
              </Button>
            </div>
          </div>
        </Card>
      )}

      {conflicts.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" aria-hidden /> Hay docentes con dos clases a la misma hora
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-foreground">
            {conflicts.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setConflicts([])}>
              Corregir
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onSave(true)} disabled={save.isPending}>
              Guardar de todos modos
            </Button>
          </div>
        </Card>
      )}

      <WeeklySchedule blocks={blocks} onRemove={canEdit ? (i) => update(blocks.filter((_, idx) => idx !== i)) : undefined} onSelect={canEdit ? pick : undefined} />

      <Card className="p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Horas por curso a la semana</h3>
        <div className="flex flex-wrap gap-2">
          {data.courses.map((c) => {
            const minutes = blocks.filter((b) => b.courseAssignmentId === c.id).reduce((s, b) => s + toMin(b.endTime) - toMin(b.startTime), 0);
            return (
              <span key={c.id} className={cn('rounded-lg px-2.5 py-1 text-xs', minutes ? 'bg-muted text-foreground' : 'bg-amber-500/10 text-amber-800 dark:text-amber-200')}>
                {c.name}: <strong>{minutes ? `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ''}` : 'sin horas'}</strong>
              </span>
            );
          })}
        </div>
      </Card>

      {canEdit && (
        <div className="sticky bottom-4 z-10 flex justify-end gap-2">
          {dirty && (
            <Button variant="outline" onClick={() => data && (setBlocks(data.blocks), setDirty(false), setConflicts([]))} className="gap-1.5 bg-background">
              <Undo2 className="h-4 w-4" aria-hidden /> Descartar cambios
            </Button>
          )}
          <Button onClick={() => onSave(false)} disabled={!dirty || save.isPending} className="gap-1.5 shadow-lg">
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
            Guardar horario
          </Button>
        </div>
      )}
    </div>
  );
};
