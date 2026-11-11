import React, { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAssignWholeClassroom, useSaveTeachingLoad, useTeachingLoad } from '../api';
import { LEVEL_LABEL, gradeLabel, teacherName, type Level, type LoadClassroom } from '../types';

const LEVELS: Level[] = ['INITIAL', 'PRIMARY', 'SECONDARY'];
const keyOf = (classroomId: string, areaId: string) => `${classroomId}|${areaId}`;

export const TeachingLoadPage: React.FC = () => {
  const [level, setLevel] = useState<Level>('PRIMARY');
  const { data, isLoading } = useTeachingLoad(level);
  const save = useSaveTeachingLoad();
  const whole = useAssignWholeClassroom();
  const [pending, setPending] = useState<Record<string, string | null>>({});

  const byGrade = useMemo(() => {
    const map = new Map<number, LoadClassroom[]>();
    (data?.classrooms ?? []).forEach((c) => map.set(c.grade, [...(map.get(c.grade) ?? []), c]));
    return [...map.entries()];
  }, [data]);
  const changes = Object.entries(pending).map(([k, teacherId]) => {
    const [classroomId, areaId] = k.split('|');
    return { classroomId, areaId, teacherId };
  });

  const changeLevel = (l: Level) => {
    if (changes.length && !window.confirm('Tienes cambios sin guardar. ¿Descartarlos?')) return;
    setPending({});
    setLevel(l);
  };

  return (
    <div className="pb-20">
      <PageHeader title="Carga docente" description="Elige el docente de cada curso por aula. Cambiar de docente conserva las notas." />
      <Tabs value={level} onChange={changeLevel} items={LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))} className="mb-4" />

      {isLoading || !data ? <Skeleton className="h-64 w-full" /> : data.classrooms.length === 0 ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title={`No hay aulas de ${LEVEL_LABEL[level]}`} description="Crea las aulas en Configuración > Aulas." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
          <div className="space-y-4">
            {byGrade.map(([grade, rooms]) => {
              const courses = rooms[0].courses;
              if (courses.length === 0) {
                return (
                  <Card key={grade} className="p-4 text-sm text-muted-foreground">
                    {gradeLabel(level, grade)}: no tiene plan de estudios. Créalo en "Plan de estudios".
                  </Card>
                );
              }
              return (
                <Card key={grade} className="overflow-x-auto">
                  <div className="border-b border-border px-4 py-3 text-sm font-semibold">{gradeLabel(level, grade)}</div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="sticky left-0 bg-card px-4 py-2 text-left font-semibold">Aula</th>
                        {courses.map((c) => <th key={c.areaId} className="min-w-[11rem] px-2 py-2 text-left font-semibold">{c.name}</th>)}
                        <th className="px-2 py-2 text-left font-semibold">Todo el aula</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map((room) => (
                        <tr key={room.id} className="border-b border-border last:border-0">
                          <td className="sticky left-0 bg-card px-4 py-2 font-medium">"{room.section}"</td>
                          {room.courses.map((cell) => {
                            const k = keyOf(room.id, cell.areaId);
                            const value = k in pending ? pending[k] : cell.teacherId;
                            const changed = k in pending;
                            return (
                              <td key={cell.areaId} className="px-2 py-1.5">
                                <Select
                                  aria-label={`${cell.name} de "${room.section}"`}
                                  className={cn('w-full', changed && 'border-amber-500 bg-amber-500/5', !value && 'text-muted-foreground')}
                                  value={value ?? ''}
                                  onChange={(e) => {
                                    const next = e.target.value || null;
                                    const copy = { ...pending };
                                    if (next === cell.teacherId) delete copy[k]; else copy[k] = next;
                                    setPending(copy);
                                  }}
                                >
                                  <option value="" disabled={cell.hasGrades}>{cell.hasGrades ? 'Sin docente (tiene notas)' : 'Sin docente'}</option>
                                  {data.teachers.map((t) => (
                                    <option key={t.id} value={t.id}>{teacherName(t)}{cell.isTransversal && t.id === room.tutorTeacherId ? ' (tutor/a)' : ''}</option>
                                  ))}
                                </Select>
                              </td>
                            );
                          })}
                          <td className="px-2 py-1.5">
                            <Select aria-label={`Asignar todo "${room.section}"`} value="" disabled={whole.isPending}
                              onChange={(e) => e.target.value && whole.mutate({ classroomId: room.id, teacherId: e.target.value })}>
                              <option value="">Asignar a…</option>
                              {data.teachers.map((t) => <option key={t.id} value={t.id}>{teacherName(t)}</option>)}
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              );
            })}
          </div>

          <Card className="h-fit p-4 lg:sticky lg:top-4">
            <p className="text-sm font-semibold">Carga por docente</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {data.teachers.map((t) => {
                const load = data.teacherLoad.find((x) => x.teacherId === t.id);
                return (
                  <li key={t.id} className="flex justify-between gap-2">
                    <span className={cn('truncate', !load?.courses && 'text-muted-foreground')}>{teacherName(t)}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{load?.courses ?? 0} · {load?.weeklyHours ?? 0} h</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      )}

      {changes.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <p className="text-sm">{changes.length} cambio(s) sin guardar</p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setPending({})}>Descartar</Button>
              <Button disabled={save.isPending} onClick={() => save.mutate(changes, { onSuccess: () => setPending({}) })}>Guardar cambios</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
