import React from 'react';
import type { UseFormRegister } from 'react-hook-form';
import type { Classroom } from '@/features/classrooms/types';
import type { CreateAnnouncementFormData } from '../../schemas/announcement.schema';

const LEVEL_NAME: Record<string, string> = {
  INITIAL: 'Inicial',
  PRIMARY: 'Primaria',
  SECONDARY: 'Secundaria',
};

const gradeName = (level: string, grade: number) => (level === 'INITIAL' ? `${grade} años` : `${grade}.°`);

interface AnnouncementScopeSelectorProps {
  isTeacher: boolean;
  classrooms: Classroom[];
  register: UseFormRegister<CreateAnnouncementFormData>;
}

export const AnnouncementScopeSelector: React.FC<AnnouncementScopeSelectorProps> = ({
  isTeacher,
  classrooms,
  register,
}) => {
  const levelOptions = [...new Set(classrooms.map((c) => c.educationLevel))];
  const gradeOptions = [...new Map(classrooms.map((c) => [`${c.educationLevel}:${c.grade}`, c])).values()].sort(
    (a, b) => a.educationLevel.localeCompare(b.educationLevel) || a.grade - b.grade,
  );

  return (
    <div>
      <label
        htmlFor="announcement-classroom"
        className="block text-xs font-semibold text-muted-foreground uppercase mb-1"
      >
        Alcance {isTeacher && <span className="text-destructive">*</span>}
      </label>
      <select
        id="announcement-classroom"
        {...register('classroomId')}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {!isTeacher && <option value="">Todo el colegio</option>}
        {isTeacher && <option value="">-- Selecciona tu aula (obligatorio) --</option>}
        {!isTeacher && levelOptions.length > 0 && (
          <optgroup label="Por nivel">
            {levelOptions.map((l) => (
              <option key={l} value={`L:${l}`}>
                Todo {LEVEL_NAME[l]}
              </option>
            ))}
          </optgroup>
        )}
        {!isTeacher && gradeOptions.length > 0 && (
          <optgroup label="Por grado">
            {gradeOptions.map((c) => (
              <option key={`${c.educationLevel}:${c.grade}`} value={`G:${c.educationLevel}:${c.grade}`}>
                Todo {gradeName(c.educationLevel, c.grade)} de {LEVEL_NAME[c.educationLevel]}
              </option>
            ))}
          </optgroup>
        )}
        <optgroup label="Un aula">
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>
              Solo {gradeName(c.educationLevel, c.grade)} "{c.section}" · {LEVEL_NAME[c.educationLevel]}
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  );
};
