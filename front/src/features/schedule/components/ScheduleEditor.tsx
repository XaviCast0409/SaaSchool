import { confirmDialog } from '@/components/ui/confirm';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, Save, Undo2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/errors';
import {
  DAY_NAMES,
  useClassroomSchedule,
  useSaveClassroomSchedule,
  type ScheduleBlock,
} from '../api/useSchedule';
import { WeeklySchedule } from './WeeklySchedule';
import { useUnsavedChangesGuard } from '@/lib/useUnsavedChangesGuard';
import { BlockEditorForm, SCHEDULE_BREAK, type ScheduleBlockFormState } from './schedule-editor/BlockEditorForm';
import { WeeklyHoursSummaryCard } from './schedule-editor/WeeklyHoursSummaryCard';

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const fromMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const overlap = (a: ScheduleBlock, b: ScheduleBlock) =>
  a.dayOfWeek === b.dayOfWeek && a.startTime < b.endTime && b.startTime < a.endTime;

/** Editor del horario semanal de un aula (Dirección). Los cambios se guardan juntos al final. */
export const ScheduleEditor: React.FC<{
  classroomId: string;
  canEdit: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}> = ({ classroomId, canEdit, onDirtyChange }) => {
  const { data, isLoading } = useClassroomSchedule(classroomId);
  const save = useSaveClassroomSchedule(classroomId);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [dirty, setDirty] = useState(false);
  useUnsavedChangesGuard(
    dirty,
    'Tienes cambios sin guardar en el horario. Si sales ahora se perderán. ¿Salir de todos modos?',
  );
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [form, setForm] = useState<ScheduleBlockFormState>({
    days: [1],
    startTime: '08:00',
    endTime: '08:45',
    course: '',
    label: 'Recreo',
    room: '',
  });

  useEffect(() => {
    if (data) {
      setBlocks(data.blocks);
      setDirty(false);
      setConflicts([]);
    }
  }, [data]);

  const courseOf = useMemo(() => new Map((data?.courses ?? []).map((c) => [c.id, c])), [data]);

  const suggestNext = (day: number) => {
    const last = blocks.filter((b) => b.dayOfWeek === day).sort((a, b) => b.endTime.localeCompare(a.endTime))[0];
    if (!last) return;
    const duration = toMin(form.endTime) - toMin(form.startTime) || 45;
    setForm((f) => ({
      ...f,
      startTime: last.endTime,
      endTime: fromMin(Math.min(toMin(last.endTime) + duration, 23 * 60 + 59)),
    }));
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
    const isBreak = form.course === SCHEDULE_BREAK;
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
    const duration = toMin(form.endTime) - toMin(form.startTime);
    setForm((f) => ({
      ...f,
      startTime: f.endTime,
      endTime: fromMin(Math.min(toMin(f.endTime) + duration, 23 * 60 + 59)),
    }));
  };

  const copyMondayToWeek = async () => {
    const monday = blocks.filter((b) => b.dayOfWeek === 1);
    if (monday.length === 0) return toast.error('Primero arma el lunes.');
    if (
      blocks.some((b) => b.dayOfWeek > 1) &&
      !(await confirmDialog({
        title: '¿Copiar el lunes al resto de la semana?',
        description: 'Esto reemplaza martes a viernes con la estructura del lunes.',
        confirmText: 'Copiar',
      }))
    )
      return;
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
          else toast.error(getApiErrorMessage(e, 'Error al guardar horario'));
        },
      },
    );
  };

  const pick = (i: number) => {
    const b = blocks[i];
    setForm({
      days: [b.dayOfWeek],
      startTime: b.startTime,
      endTime: b.endTime,
      course: b.courseAssignmentId ?? SCHEDULE_BREAK,
      label: b.label ?? 'Recreo',
      room: b.room ?? '',
    });
    update(blocks.filter((_, idx) => idx !== i));
    toast.info('Bloque cargado en el formulario: ajústalo y pulsa “Agregar”.');
  };

  if (isLoading || !data) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-4">
      {canEdit && (
        <BlockEditorForm
          classroomLabel={data.classroom.label}
          courses={data.courses}
          form={form}
          setForm={setForm}
          onSuggestNext={suggestNext}
          onAddBlocks={addBlocks}
          onCopyMondayToWeek={copyMondayToWeek}
        />
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

      <WeeklySchedule
        blocks={blocks}
        onRemove={canEdit ? (i) => update(blocks.filter((_, idx) => idx !== i)) : undefined}
        onSelect={canEdit ? pick : undefined}
      />

      <WeeklyHoursSummaryCard courses={data.courses} blocks={blocks} />

      {canEdit && (
        <div className="sticky bottom-4 z-10 flex justify-end gap-2">
          {dirty && (
            <Button
              variant="outline"
              onClick={() => data && (setBlocks(data.blocks), setDirty(false), setConflicts([]))}
              className="gap-1.5 bg-background"
            >
              <Undo2 className="h-4 w-4" aria-hidden /> Descartar cambios
            </Button>
          )}
          <Button onClick={() => onSave(false)} disabled={!dirty || save.isPending} className="gap-1.5 shadow-lg">
            {save.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4" aria-hidden />
            )}
            Guardar horario
          </Button>
        </div>
      )}
    </div>
  );
};
