import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { PeriodStatusBadge, ProgressBar } from '@/components/ui/letter-badge';
import { useAuthStore } from '@/store/useAuthStore';
import { useMyCourses, useMyProgress, usePeriods } from '../api';
import { classroomLabel } from '../types';

export const MyCoursesPage: React.FC = () => {
  const { user } = useAuthStore();
  const { data, isLoading } = useMyCourses();
  const { data: periods } = usePeriods();
  const [period, setPeriod] = useState<number | null>(null);
  useEffect(() => {
    if (periods && period === null) setPeriod(periods.periods.find((p) => p.status === 'OPEN')?.periodNumber ?? periods.periods[periods.periods.length - 1]?.periodNumber ?? 1);
  }, [periods, period]);
  const { data: progress } = useMyProgress(period);
  const current = periods?.periods.find((p) => p.periodNumber === period);
  const tutorRooms = useMemo(
    () => [...new Map((data?.courses ?? []).filter((c) => c.classroom.tutorTeacherId === user?.id).map((c) => [c.classroom.id, c.classroom])).values()],
    [data, user],
  );

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  const courses = data?.courses ?? [];

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Mis cursos"
        description={current ? <>Periodo: {current.name} <PeriodStatusBadge status={current.status} /></> : undefined}
        actions={periods && (
          <Select aria-label="Periodo" value={period ?? ''} onChange={(e) => setPeriod(Number(e.target.value))}>
            {periods.periods.map((p) => <option key={p.periodNumber} value={p.periodNumber}>{p.name}</option>)}
          </Select>
        )}
      />
      {courses.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-8 w-8" />} title="Aún no tienes cursos asignados" description="La Dirección asigna los cursos en Carga docente." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => {
            const p = progress?.rows.find((r) => r.assignmentId === c.id);
            return (
              <Link key={c.id} to={`/gradebook/${c.id}?period=${period ?? 1}`} className="group">
                <Card className="h-full p-4 transition-colors group-hover:border-primary/50">
                  <p className="text-sm font-semibold">{c.area.name}</p>
                  <p className="text-sm text-muted-foreground">{classroomLabel(c.classroom)}</p>
                  <div className="mt-3">{p?.noStudents ? <span className="text-xs text-muted-foreground">Sin estudiantes matriculados</span> : <ProgressBar percent={p?.percent ?? 0} />}</div>
                  {p && (p.missingGrades > 0 || p.missingConclusions > 0) && (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                      {p.missingGrades > 0 && `${p.missingGrades} calificativos pendientes`}
                      {p.missingGrades > 0 && p.missingConclusions > 0 && ' · '}
                      {p.missingConclusions > 0 && `${p.missingConclusions} conclusiones`}
                    </p>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
      {tutorRooms.length > 0 && (
        <Card className="mt-6 p-4">
          <p className="text-sm font-semibold">Mi aula</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {tutorRooms.map((room) => (
              <Link key={room.id} to={`/academic/report-cards/print?classroomId=${room.id}`} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
                Libretas de {classroomLabel(room)}
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

