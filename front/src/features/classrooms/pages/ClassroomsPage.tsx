import React, { useMemo, useState } from 'react';
import { Copy, Plus, School as SchoolIcon } from 'lucide-react';
import { useSelectedAcademicYear } from '@/components/AcademicYearSwitcher';
import { toast } from 'sonner';
import {
  useClassrooms,
  useCreateClassroom,
  useDeleteClassroom,
  useSetClassroomYear,
  useUpdateClassroom,
  type CreateClassroomPayload,
} from '../api/useClassrooms';
import type { Classroom } from '../types';
import { useUsers } from '@/features/users/api/useUsers';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getApiErrorMessage } from '@/lib/errors';
import {
  LEVEL_GRADES,
  LEVEL_LABEL,
  gradeLabel,
  roomLabel,
  type Level,
  type TeacherOption,
} from '../components/classrooms/constants';
import { ClassroomCard } from '../components/classrooms/ClassroomCard';
import { ClassroomFormModal } from '../components/classrooms/ClassroomFormModal';
import { BulkCreateModal } from '../components/classrooms/BulkCreateModal';
import { CopySectionsModal } from '../components/classrooms/CopySectionsModal';

export const ClassroomsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';
  const [level, setLevel] = useState<Level>('PRIMARY');
  const [editing, setEditing] = useState<Classroom | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Classroom | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const { selected: viewedYear, current: currentYear, isOtherYear, years } = useSelectedAcademicYear();
  const setSection = useSetClassroomYear();

  const { data: allRooms = [], isLoading, isError, refetch } = useClassrooms(true, isAdmin);
  // Las secciones cerradas en el año que se está viendo solo se muestran si se pide
  const classrooms = showClosed ? allRooms : allRooms.filter((c) => c.openInYear !== false);
  const closedCount = allRooms.filter((c) => c.openInYear === false).length;
  const { data: users = [] } = useUsers('TEACHER');
  const createClassroom = useCreateClassroom();
  const updateClassroom = useUpdateClassroom();
  const deleteClassroom = useDeleteClassroom();

  // Docentes activos y en qué aula son tutores
  const teachers = useMemo<Array<TeacherOption & { tutorOfLabel?: string }>>(() => {
    return users
      .filter((u) => u.isActive !== false)
      .map((u) => {
        const room = allRooms.find((c) => c.openInYear !== false && c.tutorTeacherId === u.id);
        return {
          id: u.id,
          name: `${u.lastNamePaternal} ${u.lastNameMaternal ?? ''}`.trim() + `, ${u.firstName}`,
          tutorOf: room?.id,
          tutorOfLabel: room ? roomLabel(room) : undefined,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [users, allRooms]);

  const levelRooms = classrooms.filter((c) => c.educationLevel === level);
  const byGrade = LEVEL_GRADES[level].map((g) => ({ grade: g, rooms: levelRooms.filter((c) => c.grade === g) }));
  const counts = (l: Level) => classrooms.filter((c) => c.educationLevel === l).length;

  const changeTutor = async (c: Classroom, tutorTeacherId: string | null) => {
    try {
      // En un año que no es el vigente, el tutor es el de la sección de ese año (no cambia el actual)
      if (isOtherYear && viewedYear)
        await setSection.mutateAsync({ id: c.id, academicYearId: viewedYear.id, body: { open: true, tutorTeacherId } });
      else await updateClassroom.mutateAsync({ id: c.id, payload: { tutorTeacherId } });
      const t = teachers.find((x) => x.id === tutorTeacherId);
      const yearTxt = isOtherYear && viewedYear ? ` en ${viewedYear.year}` : '';
      toast.success(
        t ? `${t.name} será tutor(a) de ${roomLabel(c)}${yearTxt}.` : `${roomLabel(c)} quedó sin tutor(a)${yearTxt}.`,
      );
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'No se pudo cambiar el tutor.'));
    }
  };

  const toggleOpen = async (c: Classroom) => {
    if (!viewedYear) return;
    const open = c.openInYear === false;
    try {
      await setSection.mutateAsync({ id: c.id, academicYearId: viewedYear.id, body: { open } });
      toast.success(`${roomLabel(c)} ${open ? 'abierta' : 'cerrada'} en ${viewedYear.year}.`);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'No se pudo cambiar la sección.'));
    }
  };

  return (
    <div className="max-w-6xl pb-10">
      <PageHeader
        title="Aulas y secciones"
        description={`Secciones abiertas en ${viewedYear?.year ?? 'el año'}, con sus vacantes y tutor(a) de ese año. Cada docente puede ser tutor de una sola sección por año.`}
        actions={
          isAdmin && (
            <>
              {years.length > 1 && (
                <Button variant="outline" onClick={() => setCopyOpen(true)}>
                  <Copy className="mr-1 h-4 w-4" />
                  Copiar secciones de otro año
                </Button>
              )}
              <Button variant="outline" onClick={() => setBulkOpen(true)}>
                Crear varias aulas
              </Button>
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                Nueva aula
              </Button>
            </>
          )
        }
      />

      <Tabs<Level>
        value={level}
        onChange={setLevel}
        className="mb-4"
        items={(['INITIAL', 'PRIMARY', 'SECONDARY'] as Level[]).map((l) => ({
          value: l,
          label: `${LEVEL_LABEL[l]} (${counts(l)})`,
        }))}
      />
      {isAdmin && closedCount > 0 && (
        <label className="mb-4 flex w-fit items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(e) => setShowClosed(e.target.checked)}
            className="h-4 w-4 rounded"
          />
          {closedCount === 1 ? 'Mostrar la sección no abierta' : `Mostrar las ${closedCount} secciones no abiertas`} en{' '}
          {viewedYear?.year}
        </label>
      )}

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          No se pudieron cargar las aulas.{' '}
          <button type="button" className="underline" onClick={() => refetch()}>
            Reintentar
          </button>
        </div>
      ) : levelRooms.length === 0 ? (
        <EmptyState
          icon={<SchoolIcon className="h-8 w-8" />}
          title={`Aún no hay aulas de ${LEVEL_LABEL[level]}`}
          description="Usa “Crear varias aulas” para generar de una vez todas las secciones de los grados que ofreces."
          action={isAdmin && <Button onClick={() => setBulkOpen(true)}>Crear varias aulas</Button>}
        />
      ) : (
        <div className="space-y-4">
          {byGrade
            .filter((g) => g.rooms.length > 0)
            .map(({ grade, rooms }) => (
              <Card key={grade} className="p-4">
                <h3 className="mb-3 text-sm font-semibold">
                  {gradeLabel(level, grade)}{' '}
                  <span className="font-normal text-muted-foreground">· {rooms.length} sección(es)</span>
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {rooms.map((c) => (
                    <ClassroomCard
                      key={c.id}
                      classroom={c}
                      isAdmin={isAdmin}
                      viewedYear={viewedYear}
                      teachers={teachers}
                      isSectionPending={setSection.isPending}
                      isTutorPending={updateClassroom.isPending}
                      onToggleOpen={toggleOpen}
                      onEdit={(item) => {
                        setEditing(item);
                        setFormOpen(true);
                      }}
                      onDelete={setToDelete}
                      onChangeTutor={changeTutor}
                    />
                  ))}
                </div>
              </Card>
            ))}
        </div>
      )}

      {formOpen && (
        <ClassroomFormModal
          classroom={editing}
          defaultLevel={level}
          teachers={teachers}
          isSaving={createClassroom.isPending || updateClassroom.isPending || setSection.isPending}
          onClose={() => setFormOpen(false)}
          onSubmit={async (payload: CreateClassroomPayload) => {
            try {
              if (editing && isOtherYear && viewedYear) {
                // Vacantes y tutor son del año que se está viendo; nombre, turno y grado son del aula
                const { capacity, tutorTeacherId, ...room } = payload;
                await updateClassroom.mutateAsync({ id: editing.id, payload: room });
                await setSection.mutateAsync({
                  id: editing.id,
                  academicYearId: viewedYear.id,
                  body: { open: true, capacity, tutorTeacherId },
                });
                const updatedRoom: Classroom = { ...editing, ...payload };
                toast.success(
                  `${roomLabel(updatedRoom)} actualizada para ${viewedYear.year}.`,
                );
              } else if (editing) {
                await updateClassroom.mutateAsync({ id: editing.id, payload });
                const updatedRoom: Classroom = { ...editing, ...payload };
                toast.success(`${roomLabel(updatedRoom)} actualizada.`);
              } else {
                await createClassroom.mutateAsync(payload);
                toast.success(`${roomLabel(payload)} creada.`);
              }
              setFormOpen(false);
            } catch (err: unknown) {
              toast.error(getApiErrorMessage(err, 'No se pudo guardar el aula.'));
            }
          }}
        />
      )}
      {bulkOpen && <BulkCreateModal defaultLevel={level} onClose={() => setBulkOpen(false)} />}
      {copyOpen && viewedYear && (
        <CopySectionsModal
          toYear={viewedYear}
          years={years.filter((y) => y.id !== viewedYear.id)}
          defaultFromId={currentYear && currentYear.id !== viewedYear.id ? currentYear.id : undefined}
          onClose={() => setCopyOpen(false)}
        />
      )}

      <ConfirmDialog
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await deleteClassroom.mutateAsync(toDelete.id);
            toast.success(`${roomLabel(toDelete)} eliminada.`);
          } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'No se pudo eliminar el aula.'));
          } finally {
            setToDelete(null);
          }
        }}
        title={toDelete ? `Eliminar ${roomLabel(toDelete)}` : 'Eliminar aula'}
        description="Solo se puede eliminar un aula que nunca tuvo estudiantes matriculados ni cursos asignados."
        confirmText="Eliminar"
        variant="danger"
        isLoading={deleteClassroom.isPending}
      />
    </div>
  );
};
