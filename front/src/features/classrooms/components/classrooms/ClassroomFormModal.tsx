import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import type { CreateClassroomPayload } from '../../api/useClassrooms';
import type { Classroom } from '../../types';
import {
  LEVEL_GRADES,
  LEVEL_LABEL,
  SHIFT_LABEL,
  gradeLabel,
  roomLabel,
  type Level,
  type Shift,
  type TeacherOption,
} from './constants';
import { TutorSelect } from './TutorSelect';

export const ClassroomFormModal: React.FC<{
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
