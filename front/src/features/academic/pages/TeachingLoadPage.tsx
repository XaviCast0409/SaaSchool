import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, BookOpen, CheckCircle2, ChevronDown, Clock, Filter, GraduationCap, Search, Sparkles, UserCheck, Users, Wand2, X,
} from 'lucide-react';
import { Tabs } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAssignWholeClassroom, useSaveTeachingLoad, useTeachingLoad } from '../api';
import {
  LEVEL_LABEL, gradeLabel, teacherName, type Level, type LoadCell, type LoadClassroom, type TeacherLite, type TeachingLoad,
} from '../types';

const LEVELS: Level[] = ['INITIAL', 'PRIMARY', 'SECONDARY'];
const keyOf = (classroomId: string, areaId: string) => `${classroomId}|${areaId}`;

// Paleta para distinguir cursos de un vistazo (clases estáticas para que Tailwind las incluya).
const COURSE_TONES = [
  'from-indigo-500 to-violet-500',
  'from-emerald-500 to-teal-500',
  'from-sky-500 to-cyan-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-fuchsia-500 to-purple-500',
  'from-lime-500 to-green-500',
  'from-blue-500 to-indigo-500',
];
const AVATAR_TONES = [
  'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300',
];
const hash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
const initials = (t: TeacherLite) => `${t.firstName[0] ?? ''}${t.lastNamePaternal[0] ?? ''}`.toUpperCase();

const Avatar: React.FC<{ teacher?: TeacherLite | null; className?: string }> = ({ teacher, className }) => (
  <span
    className={cn(
      'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
      teacher ? AVATAR_TONES[hash(teacher.id) % AVATAR_TONES.length] : 'border border-dashed border-muted-foreground/40 text-muted-foreground',
      className,
    )}
  >
    {teacher ? initials(teacher) : '?'}
  </span>
);

const ProgressBar: React.FC<{ value: number; className?: string }> = ({ value, className }) => (
  <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}>
    <div
      className={cn('h-full rounded-full transition-all duration-500', value >= 100 ? 'bg-emerald-500' : 'bg-primary')}
      style={{ width: `${Math.min(100, value)}%` }}
    />
  </div>
);

export const TeachingLoadPage: React.FC = () => {
  const [level, setLevel] = useState<Level>('PRIMARY');
  const { data, isLoading } = useTeachingLoad(level);
  const save = useSaveTeachingLoad();
  const whole = useAssignWholeClassroom();
  const [pending, setPending] = useState<Record<string, string | null>>({});
  const [query, setQuery] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [focusTeacher, setFocusTeacher] = useState<string | null>(null);

  const valueOf = (room: LoadClassroom, cell: LoadCell) => {
    const k = keyOf(room.id, cell.areaId);
    return k in pending ? pending[k] : cell.teacherId;
  };

  const setCell = (room: LoadClassroom, cell: LoadCell, next: string | null) => {
    const k = keyOf(room.id, cell.areaId);
    setPending((prev) => {
      const copy = { ...prev };
      if (next === cell.teacherId) delete copy[k]; else copy[k] = next;
      return copy;
    });
  };

  const byGrade = useMemo(() => {
    const map = new Map<number, LoadClassroom[]>();
    (data?.classrooms ?? []).forEach((c) => map.set(c.grade, [...(map.get(c.grade) ?? []), c]));
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [data]);

  const changes = Object.entries(pending).map(([k, teacherId]) => {
    const [classroomId, areaId] = k.split('|');
    return { classroomId, areaId, teacherId };
  });

  // Indicadores calculados con los cambios sin guardar, para ver el efecto en vivo.
  const stats = useMemo(() => {
    let total = 0;
    let assigned = 0;
    (data?.classrooms ?? []).forEach((room) => room.courses.forEach((cell) => {
      total += 1;
      const k = keyOf(room.id, cell.areaId);
      if (k in pending ? pending[k] : cell.teacherId) assigned += 1;
    }));
    return { total, assigned, missing: total - assigned, pct: total ? Math.round((assigned / total) * 100) : 0 };
  }, [data, pending]);

  // Carga por docente: lo guardado en el servidor ± los cambios pendientes.
  const loadByTeacher = useMemo(() => {
    const m = new Map<string, { courses: number; hours: number }>();
    data?.teacherLoad.forEach((l) => m.set(l.teacherId, { courses: l.courses, hours: l.weeklyHours }));
    const bump = (id: string | null, sign: 1 | -1, h: number) => {
      if (!id) return;
      const cur = m.get(id) ?? { courses: 0, hours: 0 };
      m.set(id, { courses: cur.courses + sign, hours: cur.hours + sign * h });
    };
    data?.classrooms.forEach((room) => room.courses.forEach((cell) => {
      const k = keyOf(room.id, cell.areaId);
      if (!(k in pending)) return;
      bump(cell.teacherId, -1, cell.weeklyHours ?? 0);
      bump(pending[k], 1, cell.weeklyHours ?? 0);
    }));
    return m;
  }, [data, pending]);

  const changeLevel = (l: Level) => {
    if (changes.length && !window.confirm('Tienes cambios sin guardar. ¿Descartarlos?')) return;
    setPending({});
    setFocusTeacher(null);
    setLevel(l);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Encabezado */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/15 via-primary/5 to-card p-5 shadow-sm sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <GraduationCap className="h-3.5 w-3.5" /> Gestión académica
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Carga docente</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Elige el docente de cada curso por aula. Cambiar de docente conserva las notas.
            </p>
          </div>
          <Tabs value={level} onChange={changeLevel} items={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))} className="self-start bg-background/60 backdrop-blur lg:self-auto" />
        </div>

        {data && data.classrooms.length > 0 && (
          <div className="relative mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile icon={<BookOpen className="h-4 w-4" />} label="Aulas" value={data.classrooms.length} />
            <StatTile icon={<UserCheck className="h-4 w-4" />} label="Cursos asignados" value={`${stats.assigned}/${stats.total}`}>
              <ProgressBar value={stats.pct} className="mt-2" />
            </StatTile>
            <StatTile
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Sin docente"
              value={stats.missing}
              tone={stats.missing ? 'warning' : 'success'}
              onClick={stats.missing ? () => setOnlyMissing((v) => !v) : undefined}
              active={onlyMissing}
              hint={stats.missing ? (onlyMissing ? 'Mostrando solo estos' : 'Ver solo estos') : 'Todo cubierto'}
            />
            <StatTile icon={<Users className="h-4 w-4" />} label="Docentes con carga" value={`${data.teachers.filter((t) => (loadByTeacher.get(t.id)?.courses ?? 0) > 0).length}/${data.teachers.length}`} />
          </div>
        )}
      </div>

      {isLoading || !data ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
          <div className="space-y-4"><Skeleton className="h-56 w-full" /><Skeleton className="h-56 w-full" /></div>
          <Skeleton className="h-96 w-full" />
        </div>
      ) : data.classrooms.length === 0 ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title={`No hay aulas de ${LEVEL_LABEL[level]}`} description="Crea las aulas en Configuración > Aulas." />
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0 space-y-4">
            {/* Filtros */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar curso…"
                  className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-9 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
                {query && (
                  <button type="button" aria-label="Limpiar búsqueda" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOnlyMissing((v) => !v)}
                className={cn(
                  'inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium shadow-sm transition-colors',
                  onlyMissing ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'border-input bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                <Filter className="h-4 w-4" /> Solo sin docente
              </button>
            </div>

            {focusTeacher && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm animate-in fade-in slide-in-from-top-1">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                  <span>Resaltando cursos de <strong>{teacherName(data.teachers.find((t) => t.id === focusTeacher)!)}</strong></span>
                </span>
                <button type="button" onClick={() => setFocusTeacher(null)} className="text-xs font-medium text-primary hover:underline">Quitar</button>
              </div>
            )}

            {byGrade.map(([grade, rooms]) => (
              <GradeBlock
                key={grade}
                level={level}
                grade={grade}
                rooms={rooms}
                data={data}
                query={query}
                onlyMissing={onlyMissing}
                focusTeacher={focusTeacher}
                pending={pending}
                valueOf={valueOf}
                setCell={setCell}
                onWhole={(classroomId, teacherId) => whole.mutate({ classroomId, teacherId })}
                wholeBusy={whole.isPending}
              />
            ))}
          </div>

          <TeacherPanel data={data} loadByTeacher={loadByTeacher} focusTeacher={focusTeacher} onFocus={setFocusTeacher} />
        </div>
      )}

      {changes.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex w-full max-w-xl items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-xl backdrop-blur">
            <p className="flex items-center gap-2 text-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
              </span>
              <strong className="tabular-nums">{changes.length}</strong> cambio{changes.length === 1 ? '' : 's'} sin guardar
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPending({})}>Descartar</Button>
              <Button size="sm" disabled={save.isPending} onClick={() => save.mutate(changes, { onSuccess: () => setPending({}) })}>
                {save.isPending ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────

const StatTile: React.FC<{
  icon: React.ReactNode; label: string; value: React.ReactNode; tone?: 'default' | 'warning' | 'success';
  onClick?: () => void; active?: boolean; hint?: string; children?: React.ReactNode;
}> = ({ icon, label, value, tone = 'default', onClick, active, hint, children }) => {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'rounded-xl border bg-card/80 p-3 text-left shadow-sm backdrop-blur transition-all',
        onClick && 'hover:-translate-y-0.5 hover:shadow-md',
        active ? 'border-amber-500/60 ring-2 ring-amber-500/20' : 'border-border/70',
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className={cn(
          'flex h-6 w-6 items-center justify-center rounded-md',
          tone === 'warning' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            : tone === 'success' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : 'bg-primary/10 text-primary',
        )}>{icon}</span>
        {label}
      </div>
      <p className="mt-1.5 text-xl font-bold tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {children}
    </Comp>
  );
};

interface GradeBlockProps {
  level: Level; grade: number; rooms: LoadClassroom[]; data: TeachingLoad;
  query: string; onlyMissing: boolean; focusTeacher: string | null; pending: Record<string, string | null>;
  valueOf: (room: LoadClassroom, cell: LoadCell) => string | null;
  setCell: (room: LoadClassroom, cell: LoadCell, next: string | null) => void;
  onWhole: (classroomId: string, teacherId: string) => void; wholeBusy: boolean;
}

const GradeBlock: React.FC<GradeBlockProps> = ({ level, grade, rooms, data, query, onlyMissing, focusTeacher, pending, valueOf, setCell, onWhole, wholeBusy }) => {
  const sortedRooms = useMemo(() => [...rooms].sort((a, b) => a.section.localeCompare(b.section)), [rooms]);
  const [activeId, setActiveId] = useState(sortedRooms[0]?.id);
  const [open, setOpen] = useState(true);
  const room = sortedRooms.find((r) => r.id === activeId) ?? sortedRooms[0];

  if (rooms[0].courses.length === 0) {
    return (
      <Card className="flex items-center gap-3 border-dashed p-4 text-sm text-muted-foreground">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
        <span><strong className="text-foreground">{gradeLabel(level, grade)}</strong>: no tiene plan de estudios. Créalo en "Plan de estudios".</span>
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
  const visible = room.courses.filter((c) => (!q || c.name.toLowerCase().includes(q)) && (!onlyMissing || !valueOf(room, c)));
  const tutor = data.teachers.find((t) => t.id === room.tutorTeacherId);

  return (
    <Card className="overflow-hidden">
      {/* Cabecera del grado */}
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/30">
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
            <span className={cn('font-semibold tabular-nums', gradePct === 100 && 'text-emerald-600 dark:text-emerald-400')}>{gradePct}%</span>
          </div>
          <ProgressBar value={gradePct} />
        </div>
        <ChevronDown className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300', !open && '-rotate-90')} />
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
                      isActive ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'border-border bg-card hover:border-primary/40 hover:text-primary',
                    )}
                  >
                    "{r.section}"
                    <span className={cn(
                      'rounded-full px-1.5 text-[11px] font-medium tabular-nums',
                      isActive ? 'bg-white/20' : complete ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
                    )}>
                      {complete ? <CheckCircle2 className="inline h-3 w-3" /> : `${s.done}/${s.total}`}
                    </span>
                    {hasPending && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-amber-500" />}
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
                {data.teachers.map((t) => <option key={t.id} value={t.id}>{teacherName(t)}</option>)}
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 pt-4 text-xs text-muted-foreground">
            <span>Aula <strong className="text-foreground">{gradeLabel(level, grade)} "{room.section}"</strong></span>
            {room.shift && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {room.shift === 'MORNING' ? 'Mañana' : room.shift === 'AFTERNOON' ? 'Tarde' : room.shift === 'NIGHT' ? 'Noche' : room.shift}</span>}
            <span>Tutor(a): <strong className="text-foreground">{tutor ? teacherName(tutor) : 'sin asignar'}</strong></span>
          </div>

          {/* Cursos en cuadrícula: crece hacia abajo, no hacia la derecha */}
          {visible.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              {onlyMissing && !q ? '¡Todos los cursos de esta aula tienen docente!' : 'Ningún curso coincide con el filtro.'}
            </div>
          ) : (
            <div key={room.id} className="grid gap-3 p-5 animate-in fade-in slide-in-from-bottom-2 duration-300 [grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))]">
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

const CourseCard: React.FC<{
  room: LoadClassroom; cell: LoadCell; teachers: TeacherLite[]; value: string | null;
  changed: boolean; dimmed: boolean; highlighted: boolean; onChange: (next: string | null) => void;
}> = ({ room, cell, teachers, value, changed, dimmed, highlighted, onChange }) => {
  const teacher = teachers.find((t) => t.id === value) ?? null;
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-card p-3.5 pt-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
        changed ? 'border-amber-500/60 ring-2 ring-amber-500/15' : !value ? 'border-dashed border-amber-500/40 bg-amber-500/[0.03]' : 'border-border',
        highlighted && 'border-primary ring-2 ring-primary/25',
        dimmed && 'opacity-40',
      )}
    >
      <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', COURSE_TONES[hash(cell.name) % COURSE_TONES.length])} />
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-semibold leading-snug" title={cell.name}>{cell.name}</p>
        <div className="flex shrink-0 items-center gap-1">
          {cell.weeklyHours != null && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">{cell.weeklyHours} h</span>
          )}
          {changed && <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">Editado</span>}
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <Avatar teacher={teacher} />
        <div className="relative min-w-0 flex-1">
          <select
            aria-label={`${cell.name} de "${room.section}"`}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
            className={cn(
              'h-9 w-full cursor-pointer appearance-none truncate rounded-lg border border-transparent bg-muted/50 pl-2.5 pr-7 text-sm transition-colors hover:border-input focus:border-input focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/30',
              !value && 'text-amber-700 dark:text-amber-300',
            )}
          >
            <option value="" disabled={cell.hasGrades}>{cell.hasGrades ? 'Sin docente (tiene notas)' : 'Sin docente'}</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{teacherName(t)}{cell.isTransversal && t.id === room.tutorTeacherId ? ' (tutor/a)' : ''}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>
      {(cell.hasGrades || cell.isTransversal) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {cell.hasGrades && <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300">Tiene notas</span>}
          {cell.isTransversal && <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">Transversal</span>}
        </div>
      )}
    </div>
  );
};

const TeacherPanel: React.FC<{
  data: TeachingLoad; loadByTeacher: Map<string, { courses: number; hours: number }>;
  focusTeacher: string | null; onFocus: (id: string | null) => void;
}> = ({ data, loadByTeacher, focusTeacher, onFocus }) => {
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.teachers
      .map((t) => ({ t, load: loadByTeacher.get(t.id) ?? { courses: 0, hours: 0 } }))
      .filter(({ t }) => !term || teacherName(t).toLowerCase().includes(term))
      .sort((a, b) => b.load.hours - a.load.hours || b.load.courses - a.load.courses);
  }, [data.teachers, loadByTeacher, q]);
  const maxHours = Math.max(1, ...rows.map((r) => r.load.hours));

  return (
    <Card className="overflow-hidden lg:sticky lg:top-4">
      <div className="border-b border-border px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" /> Carga por docente</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Toca un docente para resaltar sus cursos.</p>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar docente…"
            className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>
      <ul className="max-h-[60vh] space-y-0.5 overflow-y-auto p-2">
        {rows.map(({ t, load }) => {
          const active = focusTeacher === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onFocus(active ? null : t.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors',
                  active ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/60',
                )}
              >
                <Avatar teacher={t} className="h-7 w-7 text-[10px]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={cn('truncate text-xs font-medium', !load.courses && 'text-muted-foreground')}>{teacherName(t)}</span>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{load.hours} h</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className={cn('h-full rounded-full transition-all duration-500', load.courses ? 'bg-primary/70' : 'bg-transparent')} style={{ width: `${(load.hours / maxHours) * 100}%` }} />
                    </div>
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{load.courses} curso{load.courses === 1 ? '' : 's'}</span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
        {rows.length === 0 && <li className="px-2 py-6 text-center text-xs text-muted-foreground">Sin resultados</li>}
      </ul>
    </Card>
  );
};
