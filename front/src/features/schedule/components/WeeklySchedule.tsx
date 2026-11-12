import React, { useMemo } from 'react';
import { Coffee, MapPin, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DAY_NAMES, SHORT_DAYS, type ScheduleBlock } from '../api/useSchedule';

/** Colores estables por curso para reconocerlos de un vistazo. */
const PALETTE = [
  'bg-sky-500/10 border-sky-500/30 text-sky-900 dark:text-sky-100',
  'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100',
  'bg-violet-500/10 border-violet-500/30 text-violet-900 dark:text-violet-100',
  'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100',
  'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-100',
  'bg-teal-500/10 border-teal-500/30 text-teal-900 dark:text-teal-100',
  'bg-indigo-500/10 border-indigo-500/30 text-indigo-900 dark:text-indigo-100',
  'bg-orange-500/10 border-orange-500/30 text-orange-900 dark:text-orange-100',
];

export function colorFor(key: string | null | undefined): string {
  if (!key) return 'bg-muted border-border text-muted-foreground';
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

interface Props {
  blocks: ScheduleBlock[];
  /** Mostrar el aula en cada bloque (horario del docente). */
  showClassroom?: boolean;
  onRemove?: (index: number) => void;
  onSelect?: (index: number) => void;
  highlightDay?: number;
}

/**
 * Horario semanal: columnas por día en pantallas grandes y lista por día en celular.
 * Los índices que reciben onRemove/onSelect corresponden al arreglo `blocks` original.
 */
export const WeeklySchedule: React.FC<Props> = ({ blocks, showClassroom, onRemove, onSelect, highlightDay }) => {
  const days = useMemo(() => {
    const hasSaturday = blocks.some((b) => b.dayOfWeek === 6);
    return hasSaturday ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
  }, [blocks]);

  const byDay = useMemo(() => {
    const map = new Map<number, Array<{ block: ScheduleBlock; index: number }>>();
    blocks.forEach((block, index) => map.set(block.dayOfWeek, [...(map.get(block.dayOfWeek) ?? []), { block, index }]));
    for (const list of map.values()) list.sort((a, b) => a.block.startTime.localeCompare(b.block.startTime));
    return map;
  }, [blocks]);

  if (blocks.length === 0) {
    return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Todavía no hay clases en el horario.</p>;
  }

  return (
    <div className={cn('grid gap-3', days.length === 6 ? 'md:grid-cols-6' : 'md:grid-cols-5')}>
      {days.map((day) => (
        <section key={day} className={cn('rounded-xl border border-border bg-card p-2', highlightDay === day && 'ring-2 ring-primary/40')} aria-label={DAY_NAMES[day]}>
          <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="md:hidden">{DAY_NAMES[day]}</span>
            <span className="hidden md:inline">{SHORT_DAYS[day]}</span>
          </h3>
          <ul className="space-y-1.5">
            {(byDay.get(day) ?? []).map(({ block, index }) => {
              const isBreak = !block.courseAssignmentId;
              return (
                <li
                  key={`${index}-${block.startTime}`}
                  className={cn(
                    'group relative rounded-lg border px-2 py-1.5 text-xs',
                    colorFor(block.courseAssignmentId),
                    onSelect && 'cursor-pointer hover:shadow-sm',
                  )}
                  onClick={onSelect ? () => onSelect(index) : undefined}
                >
                  <p className="font-mono text-[10px] opacity-80">
                    {block.startTime}–{block.endTime}
                  </p>
                  <p className="flex items-center gap-1 font-semibold leading-tight">
                    {isBreak && <Coffee className="h-3 w-3" aria-hidden />}
                    {isBreak ? block.label || 'Recreo' : block.courseName}
                  </p>
                  {!isBreak && (showClassroom ? block.classroomLabel : block.teacherName) && (
                    <p className="truncate text-[11px] opacity-80">{showClassroom ? block.classroomLabel : block.teacherName}</p>
                  )}
                  {block.room && (
                    <p className="flex items-center gap-0.5 text-[10px] opacity-70">
                      <MapPin className="h-2.5 w-2.5" aria-hidden /> {block.room}
                    </p>
                  )}
                  {onRemove && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(index);
                      }}
                      className="absolute right-1 top-1 rounded p-0.5 opacity-60 hover:bg-background/60 hover:opacity-100"
                      aria-label={`Quitar bloque de ${block.startTime}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </li>
              );
            })}
            {(byDay.get(day) ?? []).length === 0 && <li className="px-1 py-2 text-[11px] text-muted-foreground">Sin clases</li>}
          </ul>
        </section>
      ))}
    </div>
  );
};
