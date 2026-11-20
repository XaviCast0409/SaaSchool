import React from 'react';
import { Plus, Copy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { SHORT_DAYS } from '../../api/useSchedule';

export const SCHEDULE_BREAK = '__break__';

export interface ScheduleBlockFormState {
  days: number[];
  startTime: string;
  endTime: string;
  course: string;
  label: string;
  room: string;
}

interface BlockEditorFormProps {
  classroomLabel: string;
  courses: Array<{
    id: string;
    name: string;
    teacherName?: string | null;
    isTransversal?: boolean;
  }>;
  form: ScheduleBlockFormState;
  setForm: React.Dispatch<React.SetStateAction<ScheduleBlockFormState>>;
  onSuggestNext: (day: number) => void;
  onAddBlocks: () => void;
  onCopyMondayToWeek: () => void;
}

const selectClass = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground';

export const BlockEditorForm: React.FC<BlockEditorFormProps> = ({
  classroomLabel,
  courses,
  form,
  setForm,
  onSuggestNext,
  onAddBlocks,
  onCopyMondayToWeek,
}) => {
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Agregar bloque · {classroomLabel}</h2>
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
                    setForm((prev) => ({ ...prev, days }));
                    if (!on && days.length === 1) onSuggestNext(d);
                  }}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-semibold',
                    on
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted',
                  )}
                >
                  {SHORT_DAYS[d]}
                </button>
              );
            })}
          </div>
        </fieldset>
        <label className="text-xs text-muted-foreground">
          Inicio
          <Input
            type="time"
            className="h-9"
            value={form.startTime}
            onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Fin
          <Input
            type="time"
            className="h-9"
            value={form.endTime}
            onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
          />
        </label>
        <label className="col-span-2 text-xs text-muted-foreground">
          Curso
          <select
            className={selectClass}
            value={form.course}
            onChange={(e) => setForm((prev) => ({ ...prev, course: e.target.value }))}
          >
            <option value="">Elegir…</option>
            {courses
              .filter((c) => !c.isTransversal)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.teacherName ? ` · ${c.teacherName}` : ''}
                </option>
              ))}
            <option value={SCHEDULE_BREAK}>Recreo / bloque libre</option>
          </select>
        </label>
        {form.course === SCHEDULE_BREAK ? (
          <label className="text-xs text-muted-foreground">
            Nombre
            <Input
              className="h-9"
              value={form.label}
              maxLength={40}
              onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
            />
          </label>
        ) : (
          <label className="text-xs text-muted-foreground">
            Ambiente (opcional)
            <Input
              className="h-9"
              placeholder="Lab., Patio…"
              value={form.room}
              maxLength={60}
              onChange={(e) => setForm((prev) => ({ ...prev, room: e.target.value }))}
            />
          </label>
        )}
        <div className="col-span-2 flex flex-wrap items-end gap-2 md:col-span-6">
          <Button type="button" onClick={onAddBlocks} className="gap-1.5">
            <Plus className="h-4 w-4" aria-hidden /> Agregar
          </Button>
          <Button type="button" variant="outline" onClick={onCopyMondayToWeek} className="gap-1.5">
            <Copy className="h-4 w-4" aria-hidden /> Copiar estructura del lunes
          </Button>
        </div>
      </div>
    </Card>
  );
};
