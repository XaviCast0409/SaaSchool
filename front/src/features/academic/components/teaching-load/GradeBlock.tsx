import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, Wand2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { gradeLabel, teacherName, type Level, type LoadCell, type LoadClassroom, type TeachingLoad } from '../../types';
import { CourseCard } from './CourseCard';
import { ProgressBar, keyOf } from './TeachingLoadUI';

export interface GradeBlockProps {
  level: Level;
  grade: number;
  rooms: LoadClassroom[];
  data: TeachingLoad;
  query: string;
  onlyMissing: boolean;
  focusTeacher: string | null;
  pending: Record<string, string | null>;
  valueOf: (room: LoadClassroom, cell: LoadCell) => string | null;
  setCell: (room: LoadClassroom, cell: LoadCell, next: string | null) => void;
  onWhole: (classroomId: string, teacherId: string) => void;
  wholeBusy: boolean;
}

export const GradeBlock: React.FC<GradeBlockProps> = ({
  level,
  grade,
  rooms,
  data,
  query,
  onlyMissing,
  focusTeacher,
  pending,
  valueOf,
  setCell,
  onWhole,
  wholeBusy,
}) => {
  const sortedRooms = useMemo(() => [...rooms].sort((a, b) => a.section.localeCompare(b.section)), [rooms]);
  const [activeId, setActiveId] = useState(sortedRooms[0]?.id);
  const [open, setOpen] = useState(true);
  const room = sortedRooms.find((r) => r.id === activeId) ?? sortedRooms[0];

  if (rooms[0].courses.length === 0) {
    return (
      <Card className="flex items-center gap-3 border-dashed p-4 text-sm text-muted-foreground">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
        <span>
          <strong className="text-foreground">{gradeLabel(level, grade)}</strong>: no tiene plan de estudios. Créalo en
          "Plan de estudios".
        </span>
      </Card>
    );
  }

  const roomStats = (r: LoadClassroom) => {
    const done = r.courses.filter((c) => valueOf(r, c)).length;
    return { done, total: r.courses.length };
  };
  const gradeDone = sortedRooms.reduce((s, r) => s + roomStats(r).done, 0);
  const gradeTotal = sortedRooms.reduce((s, r) => s + r.courses.length, 0);
  const gradePct = gradeTotal ? Math.round((gradeDone / gradeTotal) * 100) : 0;

  const q = query.trim().toLowerCase();
  const visible = room.courses.filter(
    (c) => (!q || c.name.toLowerCase().includes(q)) && (!onlyMissing || !valueOf(room, c)),
  );
  const tutor = data.teachers.find((t) => t.id === room.tutorTeacherId);

  return (
    <Card className="overflow-hidden">
      {/* Cabecera del grado */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 text-sm font-bold text-white shadow-sm">
          {level === 'INITIAL' ? `${grade}a` : `${grade}°`}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{gradeLabel(level, grade)}</p>
          <p className="text-xs text-muted-foreground">
            {sortedRooms.length} aula{sortedRooms.length === 1 ? '' : 's'} · {rooms[0].courses.length} cursos por aula
          </p>
        </div>
        <div className="hidden w-40 sm:block">
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-muted-foreground">Avance</span>
            <span
              className={cn('font-semibold tabular-nums', gradePct === 100 && 'text-emerald-600 dark:text-emerald-400')}
            >
              {gradePct}%
            </span>
          </div>
          <ProgressBar value={gradePct} />
        </div>
        <ChevronDown
          className={cn(
            'h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300',
            !open && '-rotate-90',
          )}
        />
      </button>

      {open && (
        <div className="border-t border-border animate-in fade-in slide-in-from-top-1">
          {/* Selector de sección */}
          <div className="flex flex-col gap-3 bg-muted/20 px-5 py-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label={`Aulas de ${gradeLabel(level, grade)}`}>
              {sortedRooms.map((r) => {
                const s = roomStats(r);
                const isActive = r.id === room.id;
                const complete = s.done === s.total;
                const hasPending = r.courses.some((c) => keyOf(r.id, c.areaId) in pending);
                return (
                  <button
                    key={r.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveId(r.id)}
                    className={cn(
                      'relative inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all',
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20'
                        : 'border-border bg-card hover:border-primary/40 hover:text-primary',
                    )}
                  >
                    "{r.section}"
                    <span
                      className={cn(
                        'rounded-full px-1.5 text-xs font-medium tabular-nums',
                        isActive
                          ? 'bg-white/20'
                          : complete
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
                      )}
                    >
                      {complete ? <CheckCircle2 className="inline h-3 w-3" /> : `${s.done}/${s.total}`}
                    </span>
                    {hasPending && (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-amber-500" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Select
                aria-label={`Asignar todo "${room.section}"`}
                value=""
                disabled={wholeBusy}
                className="h-8 text-xs"
                onChange={(e) => e.target.value && onWhole(room.id, e.target.value)}
              >
                <option value="">Asignar todo "{room.section}" a…</option>
                {data.teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {teacherName(t)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 pt-4 text-xs text-muted-foreground">
            <span>
              Aula{' '}
              <strong className="text-foreground">
                {gradeLabel(level, grade)} "{room.section}"
              </strong>
            </span>
            {room.shift && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />{' '}
                {room.shift === 'MORNING'
                  ? 'Mañana'
                  : room.shift === 'AFTERNOON'
                    ? 'Tarde'
                    : room.shift === 'NIGHT'
                      ? 'Noche'
                      : room.shift}
              </span>
            )}
            <span>
              Tutor(a): <strong className="text-foreground">{tutor ? teacherName(tutor) : 'sin asignar'}</strong>
            </span>
          </div>

          {/* Cursos en cuadrícula */}
          {visible.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              {onlyMissing && !q
                ? '¡Todos los cursos de esta aula tienen docente!'
                : 'Ningún curso coincide con el filtro.'}
            </div>
          ) : (
            <div
              key={room.id}
              className="grid gap-3 p-5 animate-in fade-in slide-in-from-bottom-2 duration-300 [grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))]"
            >
              {visible.map((cell) => (
                <CourseCard
                  key={cell.areaId}
                  room={room}
                  cell={cell}
                  teachers={data.teachers}
                  value={valueOf(room, cell)}
                  changed={keyOf(room.id, cell.areaId) in pending}
                  dimmed={!!focusTeacher && valueOf(room, cell) !== focusTeacher}
                  highlighted={!!focusTeacher && valueOf(room, cell) === focusTeacher}
                  onChange={(next) => setCell(room, cell, next)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
