import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, BookOpenCheck, MonitorPlay } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeacherCourseContentsModal } from '@/features/course-contents/components/TeacherCourseContentsModal';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { PeriodStatusBadge, ProgressBar } from '@/components/ui/letter-badge';
import { useAuthStore } from '@/store/useAuthStore';
import { useGetActiveSchool } from '@/features/schools/api/useSchool';
import { PLAN_HIERARCHY } from '@/layouts/navigation';
import { useMyCourses, useMyProgress, usePeriods } from '../api';
import { classroomLabel } from '../types';

export const MyCoursesPage: React.FC = () => {
  const { user } = useAuthStore();
  const { data, isLoading } = useMyCourses();
  const { data: periods } = usePeriods();
  const [period, setPeriod] = useState<number | null>(null);
  useEffect(() => {
    if (periods && period === null)
      setPeriod(
        periods.periods.find((p) => p.status === 'OPEN')?.periodNumber ??
          periods.periods[periods.periods.length - 1]?.periodNumber ??
          1,
      );
  }, [periods, period]);
  // Registro de notas, avance y libretas son del plan PRO: en BASIC el docente usa el aula virtual
  const { data: school } = useGetActiveSchool();
  const hasGrades = school ? (PLAN_HIERARCHY[school.plan ?? 'BASIC'] ?? 1) >= PLAN_HIERARCHY.PRO : null;
  const { data: progress } = useMyProgress(hasGrades ? period : null);
  const [virtualClassroom, setVirtualClassroom] =
    useState<React.ComponentProps<typeof TeacherCourseContentsModal>['assignment']>(null);
  const gradebookUrl = (assignmentId: string) => `/gradebook/${assignmentId}?period=${period ?? 1}`;
  const current = periods?.periods.find((p) => p.periodNumber === period);
  // Aulas de tutoría: las que envía el servidor (aunque no dicte cursos en ellas) y, por compatibilidad, las de sus cursos
  const tutorRooms = useMemo(
    () => [
      ...new Map(
        [...(data?.tutorClassrooms ?? []), ...(data?.courses ?? []).map((c) => c.classroom)]
          .filter((room) => room.tutorTeacherId === user?.id)
          .map((room) => [room.id, room]),
      ).values(),
    ],
    [data, user],
  );

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  const courses = data?.courses ?? [];

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Mis cursos"
        description={
          current ? (
            <>
              Periodo: {current.name} <PeriodStatusBadge status={current.status} />
            </>
          ) : undefined
        }
        actions={
          periods && (
            <Select aria-label="Periodo" value={period ?? ''} onChange={(e) => setPeriod(Number(e.target.value))}>
              {periods.periods.map((p) => (
                <option key={p.periodNumber} value={p.periodNumber}>
                  {p.name}
                </option>
              ))}
            </Select>
          )
        }
      />
      {hasGrades === false && (
        <p className="mb-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          El registro de notas, el avance y las libretas están disponibles en el plan PRO del colegio. Mientras tanto,
          publica tus clases y tareas en el aula virtual.
        </p>
      )}
      {courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8" />}
          title="Aún no tienes cursos asignados"
          description="La Dirección asigna los cursos en Carga docente."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => {
            const p = progress?.rows.find((r) => r.assignmentId === c.id);
            return (
              <Card key={c.id} className="flex h-full flex-col p-4 transition-colors hover:border-primary/50">
                {hasGrades === false ? (
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{c.area.name}</p>
                    <p className="text-sm text-muted-foreground">{classroomLabel(c.classroom)}</p>
                  </div>
                ) : (
                  <Link to={gradebookUrl(c.id)} className="flex-1">
                    <p className="text-sm font-semibold">{c.area.name}</p>
                    <p className="text-sm text-muted-foreground">{classroomLabel(c.classroom)}</p>
                    <div className="mt-3">
                      {p?.noStudents ? (
                        <span className="text-xs text-muted-foreground">Sin estudiantes matriculados</span>
                      ) : p ? (
                        <ProgressBar percent={p.percent} />
                      ) : (
                        <div className="h-2 w-full animate-pulse rounded-full bg-muted" aria-hidden />
                      )}
                    </div>
                    {p && (p.missingGrades > 0 || p.missingConclusions > 0) && (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                        {p.missingGrades > 0 && `${p.missingGrades} calificativos pendientes`}
                        {p.missingGrades > 0 && p.missingConclusions > 0 && ' · '}
                        {p.missingConclusions > 0 && `${p.missingConclusions} conclusiones`}
                      </p>
                    )}
                  </Link>
                )}
                <div
                  className={`mt-3 grid gap-2 border-t border-border pt-3 ${hasGrades === false ? 'grid-cols-1' : 'grid-cols-2'}`}
                >
                  {hasGrades !== false && (
                    <Button asChild size="sm" variant="outline" className="gap-1.5">
                      <Link to={gradebookUrl(c.id)}>
                        <BookOpenCheck className="h-4 w-4" />
                        Notas
                      </Link>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() =>
                      setVirtualClassroom({
                        id: c.id,
                        areaName: c.area.name,
                        grade: c.classroom.grade,
                        section: c.classroom.section,
                        educationLevel: c.classroom.educationLevel,
                      })
                    }
                  >
                    <MonitorPlay className="h-4 w-4" />
                    Aula virtual
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {tutorRooms.length > 0 && hasGrades !== false && (
        <Card className="mt-6 p-4">
          <p className="text-sm font-semibold">Mi aula</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {tutorRooms.map((room) => (
              <React.Fragment key={room.id}>
                <Link
                  to={`/academic/tutor-report?classroomId=${room.id}`}
                  className="rounded-md border border-primary/40 bg-primary/5 px-3 py-1.5 text-sm hover:bg-primary/10"
                >
                  Conducta y comentarios · {classroomLabel(room)}
                </Link>
                <Link
                  to={`/academic/report-cards/print?classroomId=${room.id}`}
                  className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  Libretas de {classroomLabel(room)}
                </Link>
              </React.Fragment>
            ))}
          </div>
        </Card>
      )}
      <TeacherCourseContentsModal
        isOpen={virtualClassroom !== null}
        onClose={() => setVirtualClassroom(null)}
        assignment={virtualClassroom}
      />
    </div>
  );
};
