import React from 'react';
import { Select } from '@/components/ui/select';
import type { TeacherOption } from './constants';

/** Selector de tutor: los docentes que ya son tutores de otra aula aparecen deshabilitados. */
export const TutorSelect: React.FC<{
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
