import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Filter,
  GraduationCap,
  Search,
  Sparkles,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useSelectedAcademicYear } from '@/components/AcademicYearSwitcher';
import { Button } from '@/components/ui/button';
import { confirmDialog } from '@/components/ui/confirm';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAssignWholeClassroom, useSaveTeachingLoad, useTeachingLoad } from '../api';
import { GradeBlock } from '../components/teaching-load/GradeBlock';
import { TeacherPanel } from '../components/teaching-load/TeacherPanel';
import { ProgressBar, StatTile, keyOf } from '../components/teaching-load/TeachingLoadUI';
import {
  LEVEL_LABEL,
  teacherName,
  type Level,
  type LoadCell,
  type LoadClassroom,
} from '../types';

const LEVELS: Level[] = ['INITIAL', 'PRIMARY', 'SECONDARY'];

export const TeachingLoadPage: React.FC = () => {
  const viewedYear = useSelectedAcademicYear().selected?.year;
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
      if (next === cell.teacherId) delete copy[k];
      else copy[k] = next;
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

  const stats = useMemo(() => {
    let total = 0;
    let assigned = 0;
    (data?.classrooms ?? []).forEach((room) =>
      room.courses.forEach((cell) => {
        total += 1;
        const k = keyOf(room.id, cell.areaId);
        if (k in pending ? pending[k] : cell.teacherId) assigned += 1;
      }),
    );
    return { total, assigned, missing: total - assigned, pct: total ? Math.round((assigned / total) * 100) : 0 };
  }, [data, pending]);

  const loadByTeacher = useMemo(() => {
    const m = new Map<string, { courses: number; hours: number }>();
    data?.teacherLoad.forEach((l) => m.set(l.teacherId, { courses: l.courses, hours: l.weeklyHours }));
    const bump = (id: string | null, sign: 1 | -1, h: number) => {
      if (!id) return;
      const cur = m.get(id) ?? { courses: 0, hours: 0 };
      m.set(id, { courses: cur.courses + sign, hours: cur.hours + sign * h });
    };
    data?.classrooms.forEach((room) =>
      room.courses.forEach((cell) => {
        const k = keyOf(room.id, cell.areaId);
        if (!(k in pending)) return;
        bump(cell.teacherId, -1, cell.weeklyHours ?? 0);
        bump(pending[k], 1, cell.weeklyHours ?? 0);
      }),
    );
    return m;
  }, [data, pending]);

  useEffect(() => {
    if (changes.length === 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [changes.length]);

  const changeLevel = async (l: Level) => {
    if (
      changes.length &&
      !(await confirmDialog({
        title: '¿Descartar los cambios sin guardar?',
        description: 'Tienes cambios en la carga docente que todavía no guardaste.',
        confirmText: 'Descartar cambios',
        cancelText: 'Seguir editando',
      }))
    )
      return;
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
            <h1 className="text-2xl font-bold tracking-tight">Carga docente{viewedYear ? ` ${viewedYear}` : ''}</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Elige el docente de cada curso por aula. Cambiar de docente conserva las notas.
            </p>
          </div>
          <Tabs
            value={level}
            onChange={changeLevel}
            items={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))}
            className="self-start bg-background/60 backdrop-blur lg:self-auto"
          />
        </div>

        {data && data.classrooms.length > 0 && (
          <div className="relative mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile icon={<BookOpen className="h-4 w-4" />} label="Aulas" value={data.classrooms.length} />
            <StatTile
              icon={<UserCheck className="h-4 w-4" />}
              label="Cursos asignados"
              value={`${stats.assigned}/${stats.total}`}
            >
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
            <StatTile
              icon={<Users className="h-4 w-4" />}
              label="Docentes con carga"
              value={`${data.teachers.filter((t) => (loadByTeacher.get(t.id)?.courses ?? 0) > 0).length}/${data.teachers.length}`}
            />
          </div>
        )}
      </div>

      {isLoading || !data ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
          <div className="space-y-4">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      ) : data.classrooms.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title={`No hay aulas de ${LEVEL_LABEL[level]}`}
          description="Crea las aulas en Configuración > Aulas."
        />
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
                  <button
                    type="button"
                    aria-label="Limpiar búsqueda"
                    onClick={() => setQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOnlyMissing((v) => !v)}
                className={cn(
                  'inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium shadow-sm transition-colors',
                  onlyMissing
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    : 'border-input bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                <Filter className="h-4 w-4" /> Solo sin docente
              </button>
            </div>

            {focusTeacher && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm animate-in fade-in slide-in-from-top-1">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                  <span>
                    Resaltando cursos de{' '}
                    <strong>{teacherName(data.teachers.find((t) => t.id === focusTeacher)!)}</strong>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setFocusTeacher(null)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Quitar
                </button>
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

          <TeacherPanel
            data={data}
            loadByTeacher={loadByTeacher}
            focusTeacher={focusTeacher}
            onFocus={setFocusTeacher}
          />
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
              <strong className="tabular-nums">{changes.length}</strong> cambio{changes.length === 1 ? '' : 's'} sin
              guardar
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPending({})}>
                Descartar
              </Button>
              <Button
                size="sm"
                disabled={save.isPending}
                onClick={() => save.mutate(changes, { onSuccess: () => setPending({}) })}
              >
                {save.isPending ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
