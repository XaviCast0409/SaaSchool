import { getApiErrorMessage } from '@/lib/errors';
import React, { useMemo, useState } from 'react';
import { Copy, DoorClosed, DoorOpen, Pencil, Plus, School as SchoolIcon, Trash2, Users } from 'lucide-react';
import { useSelectedAcademicYear } from '@/components/AcademicYearSwitcher';
import { toast } from 'sonner';
import {
  useBulkCreateClassrooms,
  useClassrooms,
  useCreateClassroom,
  useCopyClassroomYear,
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
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';

type Level = 'INITIAL' | 'PRIMARY' | 'SECONDARY';
type Shift = 'MORNING' | 'AFTERNOON' | 'NIGHT';

const LEVEL_LABEL: Record<Level, string> = { INITIAL: 'Inicial', PRIMARY: 'Primaria', SECONDARY: 'Secundaria' };
const LEVEL_GRADES: Record<Level, number[]> = {
  INITIAL: [3, 4, 5],
  PRIMARY: [1, 2, 3, 4, 5, 6],
  SECONDARY: [1, 2, 3, 4, 5],
};
const SHIFT_LABEL: Record<Shift, string> = { MORNING: 'Mañana', AFTERNOON: 'Tarde', NIGHT: 'Noche' };
const gradeLabel = (level: Level, grade: number) =>
  level === 'INITIAL' ? `${grade} años` : `${grade}.° ${LEVEL_LABEL[level]}`;
const roomLabel = (c: { educationLevel: Level; grade: number; section: string }) =>
  `${gradeLabel(c.educationLevel, c.grade)} "${c.section}"`;

interface TeacherOption {
  id: string;
  name: string;
  tutorOf?: string;
  tutorOfLabel?: string;
}

/** Selector de tutor: los docentes que ya son tutores de otra aula aparecen deshabilitados. */
const TutorSelect: React.FC<{
  value: string | null;
  classroomId?: string;
  teachers: TeacherOption[];
  onChange: (id: string | null) => void;
  className?: string;
  disabled?: boolean;
}> = ({ value, classroomId, teachers, onChange, className, disabled }) => (
  <Select
    className={className}
    value={value ?? ''}
    disabled={disabled}
    onChange={(e) => onChange(e.target.value || null)}
    aria-label="Tutor(a) del aula"
  >
    <option value="">Sin tutor(a)</option>
    {teachers.map((t) => {
      const busy = !!t.tutorOf && t.tutorOf !== classroomId;
      return (
        <option key={t.id} value={t.id} disabled={busy}>
          {t.name}
          {busy ? ` — ya es tutor(a) de ${t.tutorOfLabel ?? 'otra aula'}` : ''}
        </option>
      );
    })}
  </Select>
);

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
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'No se pudo cambiar el tutor.'));
    }
  };

  const toggleOpen = async (c: Classroom) => {
    if (!viewedYear) return;
    const open = c.openInYear === false;
    try {
      await setSection.mutateAsync({ id: c.id, academicYearId: viewedYear.id, body: { open } });
      toast.success(`${roomLabel(c)} ${open ? 'abierta' : 'cerrada'} en ${viewedYear.year}.`);
    } catch (err: any) {
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
                  {rooms.map((c) => {
                    const enrolled = c.enrolledCount ?? 0;
                    const pct = c.capacity > 0 ? Math.round((enrolled / c.capacity) * 100) : 0;
                    return (
                      <div
                        key={c.id}
                        className={cn(
                          'rounded-lg border border-border p-3',
                          c.openInYear === false && 'border-dashed opacity-70',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-base font-semibold">Sección "{c.section}"</p>
                            <p className="text-xs text-muted-foreground">
                              Turno {SHIFT_LABEL[c.shift as Shift].toLowerCase()}
                              {c.openInYear === false && (
                                <span className="ml-1 font-semibold text-amber-700 dark:text-amber-400">
                                  · No abierta en {viewedYear?.year}
                                </span>
                              )}
                            </p>
                          </div>
                          {isAdmin && (
                            <div className="flex">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={setSection.isPending}
                                title={
                                  c.openInYear === false
                                    ? `Abrir en ${viewedYear?.year}`
                                    : `Cerrar en ${viewedYear?.year}`
                                }
                                aria-label={
                                  c.openInYear === false
                                    ? `Abrir ${roomLabel(c)} en ${viewedYear?.year}`
                                    : `Cerrar ${roomLabel(c)} en ${viewedYear?.year}`
                                }
                                onClick={() => toggleOpen(c)}
                              >
                                {c.openInYear === false ? (
                                  <DoorOpen className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <DoorClosed className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label={`Editar ${roomLabel(c)}`}
                                onClick={() => {
                                  setEditing(c);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                aria-label={`Eliminar ${roomLabel(c)}`}
                                onClick={() => setToDelete(c)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {enrolled} de {c.capacity} estudiantes
                            </span>
                            <span>{pct}%</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                pct >= 100 ? 'bg-red-500' : pct >= 85 ? 'bg-amber-500' : 'bg-emerald-500',
                              )}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="mt-3">
                          <p className="mb-1 text-xs font-medium text-muted-foreground">Tutor(a)</p>
                          {isAdmin ? (
                            <TutorSelect
                              className="w-full"
                              value={c.tutorTeacherId ?? null}
                              classroomId={c.id}
                              teachers={teachers}
                              disabled={updateClassroom.isPending}
                              onChange={(id) => changeTutor(c, id)}
                            />
                          ) : (
                            <p className="text-sm">
                              {c.tutorTeacher ? (
                                `${c.tutorTeacher.firstName} ${c.tutorTeacher.lastNamePaternal}`
                              ) : (
                                <span className="text-muted-foreground">Sin tutor(a)</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
          onSubmit={async (payload) => {
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
                toast.success(
                  `${roomLabel({ ...editing, ...payload } as Classroom)} actualizada para ${viewedYear.year}.`,
                );
              } else if (editing) {
                await updateClassroom.mutateAsync({ id: editing.id, payload });
                toast.success(`${roomLabel({ ...editing, ...payload } as Classroom)} actualizada.`);
              } else {
                await createClassroom.mutateAsync(payload);
                toast.success(`${roomLabel(payload as Classroom)} creada.`);
              }
              setFormOpen(false);
            } catch (err: any) {
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
          } catch (err: any) {
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

const ClassroomFormModal: React.FC<{
  classroom: Classroom | null;
  defaultLevel: Level;
  teachers: Array<TeacherOption & { tutorOfLabel?: string }>;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateClassroomPayload) => void;
}> = ({ classroom, defaultLevel, teachers, isSaving, onClose, onSubmit }) => {
  const [form, setForm] = useState<CreateClassroomPayload>(() =>
    classroom
      ? {
          educationLevel: classroom.educationLevel,
          grade: classroom.grade,
          section: classroom.section,
          shift: classroom.shift,
          capacity: classroom.capacity,
          tutorTeacherId: classroom.tutorTeacherId ?? null,
        }
      : {
          educationLevel: defaultLevel,
          grade: LEVEL_GRADES[defaultLevel][0],
          section: 'A',
          shift: 'MORNING',
          capacity: 30,
          tutorTeacherId: null,
        },
  );
  const enrolled = classroom?.enrolledCount ?? 0;
  const lockLevel = !!classroom && enrolled > 0;
  const capacityError =
    (form.capacity ?? 0) < enrolled ? `No puede ser menor que los ${enrolled} estudiantes matriculados.` : '';
  const valid =
    form.section.trim().length > 0 && !capacityError && (form.capacity ?? 0) >= 1 && (form.capacity ?? 0) <= 60;

  return (
    <Modal
      open
      onClose={onClose}
      title={classroom ? `Editar ${roomLabel(classroom)}` : 'Nueva aula'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!valid || isSaving}
            onClick={() => onSubmit({ ...form, section: form.section.trim().toUpperCase() })}
          >
            {classroom ? 'Guardar cambios' : 'Crear aula'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Nivel
          <Select
            className="mt-1 w-full"
            value={form.educationLevel}
            disabled={lockLevel}
            onChange={(e) => {
              const l = e.target.value as Level;
              setForm({ ...form, educationLevel: l, grade: LEVEL_GRADES[l][0] });
            }}
          >
            {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABEL[l]}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-medium">
          Grado
          <Select
            className="mt-1 w-full"
            value={form.grade}
            disabled={lockLevel}
            onChange={(e) => setForm({ ...form, grade: Number(e.target.value) })}
          >
            {LEVEL_GRADES[form.educationLevel].map((g) => (
              <option key={g} value={g}>
                {gradeLabel(form.educationLevel, g)}
              </option>
            ))}
          </Select>
        </label>
        {lockLevel && (
          <p className="text-xs text-muted-foreground sm:col-span-2">
            El nivel y el grado no se pueden cambiar porque el aula ya tiene estudiantes matriculados.
          </p>
        )}
        <label className="text-sm font-medium">
          Sección
          <Input
            className="mt-1"
            maxLength={10}
            value={form.section}
            placeholder="A, B, Única…"
            onChange={(e) => setForm({ ...form, section: e.target.value.toUpperCase() })}
          />
        </label>
        <label className="text-sm font-medium">
          Turno
          <Select
            className="mt-1 w-full"
            value={form.shift}
            onChange={(e) => setForm({ ...form, shift: e.target.value as Shift })}
          >
            {(Object.keys(SHIFT_LABEL) as Shift[]).map((s) => (
              <option key={s} value={s}>
                {SHIFT_LABEL[s]}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-medium">
          Capacidad
          <Input
            className="mt-1"
            type="number"
            min={Math.max(1, enrolled)}
            max={60}
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
          />
          {capacityError ? (
            <span className="mt-1 block text-xs text-red-600">{capacityError}</span>
          ) : (
            classroom && (
              <span className="mt-1 block text-xs text-muted-foreground">{enrolled} matriculados actualmente.</span>
            )
          )}
        </label>
        <label className="text-sm font-medium">
          Tutor(a)
          <TutorSelect
            className="mt-1 w-full"
            value={form.tutorTeacherId ?? null}
            classroomId={classroom?.id}
            teachers={teachers}
            onChange={(id) => setForm({ ...form, tutorTeacherId: id })}
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Registra las competencias transversales y puede imprimir las libretas del aula.
          </span>
        </label>
      </div>
    </Modal>
  );
};

const BulkCreateModal: React.FC<{ defaultLevel: Level; onClose: () => void }> = ({ defaultLevel, onClose }) => {
  const bulk = useBulkCreateClassrooms();
  const [level, setLevel] = useState<Level>(defaultLevel);
  const [grades, setGrades] = useState<number[]>(LEVEL_GRADES[defaultLevel]);
  const [sectionsText, setSectionsText] = useState('A');
  const [shift, setShift] = useState<Shift>('MORNING');
  const [capacity, setCapacity] = useState(30);
  const sections = [
    ...new Set(
      sectionsText
        .split(/[,\s]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
  const total = grades.length * sections.length;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Crear varias aulas"
      description="Genera todas las secciones de una vez. Las aulas que ya existen se omiten."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={total === 0 || bulk.isPending}
            onClick={async () => {
              try {
                const r = await bulk.mutateAsync({ educationLevel: level, grades, sections, shift, capacity });
                toast.success(
                  `${r.created.length} aula(s) creada(s)${r.skipped.length ? ` · ${r.skipped.length} ya existían` : ''}.`,
                );
                onClose();
              } catch (err: any) {
                toast.error(getApiErrorMessage(err, 'No se pudieron crear las aulas.'));
              }
            }}
          >
            Crear {total} aula(s)
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block text-sm font-medium">
          Nivel
          <Select
            className="mt-1 w-full"
            value={level}
            onChange={(e) => {
              const l = e.target.value as Level;
              setLevel(l);
              setGrades(LEVEL_GRADES[l]);
            }}
          >
            {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABEL[l]}
              </option>
            ))}
          </Select>
        </label>
        <div>
          <p className="text-sm font-medium">Grados</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {LEVEL_GRADES[level].map((g) => {
              const on = grades.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrades(on ? grades.filter((x) => x !== g) : [...grades, g].sort((a, b) => a - b))}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm',
                    on ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground',
                  )}
                >
                  {gradeLabel(level, g)}
                </button>
              );
            })}
          </div>
        </div>
        <label className="block text-sm font-medium">
          Secciones
          <Input
            className="mt-1"
            value={sectionsText}
            onChange={(e) => setSectionsText(e.target.value)}
            placeholder="A, B, C"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Separa las secciones con comas. Ejemplo: A, B, C
          </span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Turno
            <Select className="mt-1 w-full" value={shift} onChange={(e) => setShift(e.target.value as Shift)}>
              {(Object.keys(SHIFT_LABEL) as Shift[]).map((s) => (
                <option key={s} value={s}>
                  {SHIFT_LABEL[s]}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-medium">
            Capacidad de cada aula
            <Input
              className="mt-1"
              type="number"
              min={1}
              max={60}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
            />
          </label>
        </div>
        {total > 0 && (
          <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
            Se crearán:{' '}
            {grades.map((g) => sections.map((s) => `${gradeLabel(level, g)} "${s}"`).join(', ')).join(' · ')}
          </p>
        )}
        <p className="text-xs text-muted-foreground">Los tutores se asignan después, en cada aula.</p>
      </div>
    </Modal>
  );
};

/** Copia las secciones (vacantes y, si se quiere, tutores) de otro año al que se está viendo. */
const CopySectionsModal: React.FC<{
  toYear: { id: string; year: number };
  years: Array<{ id: string; year: number }>;
  defaultFromId?: string;
  onClose: () => void;
}> = ({ toYear, years, defaultFromId, onClose }) => {
  const copy = useCopyClassroomYear();
  const [fromId, setFromId] = useState(defaultFromId ?? years[0]?.id ?? '');
  const [includeTutors, setIncludeTutors] = useState(false);
  return (
    <Modal
      open
      onClose={onClose}
      title={`Copiar secciones a ${toYear.year}`}
      description="Se abren en este año las secciones del año de origen que aún no están abiertas, con sus mismas vacantes."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!fromId || copy.isPending}
            onClick={() =>
              copy.mutate(
                { fromAcademicYearId: fromId, toAcademicYearId: toYear.id, includeTutors },
                {
                  onSuccess: (r) => {
                    toast.success(
                      r.copied
                        ? `Se abrieron ${r.copied} secciones en ${toYear.year}.`
                        : 'No había secciones nuevas que copiar.',
                    );
                    onClose();
                  },
                  onError: (err: any) => toast.error(getApiErrorMessage(err, 'No se pudo copiar.')),
                },
              )
            }
          >
            Copiar
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <label className="block space-y-1">
          <span className="font-medium">Desde el año</span>
          <Select value={fromId} onChange={(e) => setFromId(e.target.value)} className="w-full">
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.year}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeTutors}
            onChange={(e) => setIncludeTutors(e.target.checked)}
            className="h-4 w-4 rounded"
          />
          Copiar también los tutores
        </label>
      </div>
    </Modal>
  );
};
