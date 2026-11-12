import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/useAuthStore';
import { useParentStore } from '@/store/useParentStore';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { useGetMyChildren } from '@/features/students/api/useStudents';
import { ChildSwitcher } from '@/features/parent/components/ChildSwitcher';
import { getPeruToday } from '@/lib/dateUtils';
import { useMyTeacherSchedule, useStudentSchedule } from '../api/useSchedule';
import { ScheduleEditor } from '../components/ScheduleEditor';
import { WeeklySchedule } from '../components/WeeklySchedule';
import { NextDayCard } from '../components/NextDayCard';
import { ScheduleGenerator } from '../components/ScheduleGenerator';
import { ScheduleConflicts } from '../components/ScheduleConflicts';

const todayWeekday = () => new Date(`${getPeruToday()}T12:00:00Z`).getUTCDay();

const levelName = (l: string) => (l === 'INITIAL' ? 'Inicial' : l === 'PRIMARY' ? 'Primaria' : 'Secundaria');

/** Dirección y Secretaría: elegir un aula y ver/editar su horario. */
const ClassroomScheduleView: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const { data: classrooms = [], isLoading } = useClassrooms();
  const [classroomId, setClassroomId] = useState<string>('');
  useEffect(() => {
    if (!classroomId && classrooms.length) setClassroomId(classrooms[0].id);
  }, [classrooms, classroomId]);
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  return (
    <div className="space-y-4">
      <label className="block max-w-sm text-xs text-muted-foreground">
        Aula
        <select
          className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
          value={classroomId}
          onChange={(e) => setClassroomId(e.target.value)}
        >
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.educationLevel === 'INITIAL' ? `${c.grade} años` : `${c.grade}.°`} "{c.section}" · {levelName(c.educationLevel)}
            </option>
          ))}
        </select>
      </label>
      {classroomId && <ScheduleEditor key={classroomId} classroomId={classroomId} canEdit={canEdit} />}
    </div>
  );
};

const TeacherView: React.FC = () => {
  const { data, isLoading } = useMyTeacherSchedule(true);
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  return <WeeklySchedule blocks={data ?? []} showClassroom highlightDay={todayWeekday()} />;
};

const FamilyView: React.FC = () => {
  const { user } = useAuthStore();
  const isStudent = user?.role === 'STUDENT';
  const { data: children = [] } = useGetMyChildren(!isStudent);
  const { selectedChildId, setSelectedChildId } = useParentStore();
  const studentId = useMemo(() => {
    if (isStudent) return user?.studentId ?? null;
    return children.some((c) => c.id === selectedChildId) ? selectedChildId : children[0]?.id ?? null;
  }, [isStudent, user, children, selectedChildId]);
  const { data, isLoading } = useStudentSchedule(studentId);

  return (
    <div className="space-y-4">
      {!isStudent && <ChildSwitcher childrenList={children} selectedId={studentId ?? ''} onSelect={setSelectedChildId} />}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <NextDayCard studentId={studentId} />
        </div>
        <div className="lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Horario semanal {data?.classroom ? `· ${data.classroom.label}` : ''}</h2>
          {isLoading ? <Skeleton className="h-64 w-full" /> : <WeeklySchedule blocks={data?.blocks ?? []} highlightDay={todayWeekday()} />}
        </div>
      </div>
    </div>
  );
};

export const SchedulePage: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role;
  const isManager = role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
  const [tab, setTab] = useState<'mine' | 'classrooms'>('mine');
  const [adminTab, setAdminTab] = useState<'classrooms' | 'generator' | 'conflicts'>('classrooms');

  if (role === 'PARENT' || role === 'STUDENT') {
    return (
      <div className="max-w-6xl">
        <PageHeader title="Horario" description="Qué toca cada día y qué llevar. Se actualiza solo cuando el colegio cambia el horario." />
        <FamilyView />
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Horario de clases"
        description={isManager ? 'Arma el horario de cada aula. El sistema avisa si un docente queda en dos aulas a la misma hora.' : 'Tus clases de la semana.'}
      />
      {role === 'TEACHER' && (
        <div className="mb-4 inline-flex rounded-lg border border-border p-0.5 text-xs">
          {(['mine', 'classrooms'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 font-semibold ${tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              {t === 'mine' ? 'Mi horario' : 'Horario por aula'}
            </button>
          ))}
        </div>
      )}
      {isManager && (
        <div className="mb-4 inline-flex flex-wrap rounded-lg border border-border p-0.5 text-xs">
          {([
            ['classrooms', 'Por aula'],
            ['generator', 'Armado automático'],
            ['conflicts', 'Cruces del colegio'],
          ] as const).map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => setAdminTab(t)}
              className={`rounded-md px-3 py-1.5 font-semibold ${adminTab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {role === 'TEACHER' && tab === 'mine' ? (
        <TeacherView />
      ) : isManager && adminTab === 'generator' ? (
        <ScheduleGenerator />
      ) : isManager && adminTab === 'conflicts' ? (
        <ScheduleConflicts />
      ) : (
        <ClassroomScheduleView canEdit={isManager} />
      )}
    </div>
  );
};
