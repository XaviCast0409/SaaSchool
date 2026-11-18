import type React from 'react';
import type { Classroom } from '@/features/classrooms/types';
import { formatClassroomLabel, sortClassrooms } from '@/lib/classroomLabel';
import { Select } from '@/components/ui/select';

export interface ClassroomSelectProps {
  classrooms: Classroom[];
  value: string;
  onChange: (id: string) => void;
  allLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export const ClassroomSelect: React.FC<ClassroomSelectProps> = ({
  classrooms,
  value,
  onChange,
  allLabel,
  placeholder,
  disabled,
  id,
  className,
}) => {
  const sorted = sortClassrooms(classrooms);

  return (
    <Select
      id={id}
      value={value}
      disabled={disabled}
      className={className}
      onChange={(e) => onChange(e.target.value)}
    >
      {allLabel ? (
        <option value="">{allLabel}</option>
      ) : placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {sorted.map((c) => (
        <option key={c.id} value={c.id}>
          {formatClassroomLabel(c)}
        </option>
      ))}
    </Select>
  );
};
