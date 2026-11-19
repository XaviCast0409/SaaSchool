import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { teacherName, type LoadCell, type LoadClassroom, type TeacherLite } from '../../types';
import { COURSE_TONES, hash } from '../../utils/colorTones';
import { Avatar } from './TeachingLoadUI';

interface CourseCardProps {
  room: LoadClassroom;
  cell: LoadCell;
  teachers: TeacherLite[];
  value: string | null;
  changed: boolean;
  dimmed: boolean;
  highlighted: boolean;
  onChange: (next: string | null) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  room,
  cell,
  teachers,
  value,
  changed,
  dimmed,
  highlighted,
  onChange,
}) => {
  const teacher = teachers.find((t) => t.id === value) ?? null;
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-card p-3.5 pt-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
        changed
          ? 'border-amber-500/60 ring-2 ring-amber-500/15'
          : !value
            ? 'border-dashed border-amber-500/40 bg-amber-500/[0.03]'
            : 'border-border',
        highlighted && 'border-primary ring-2 ring-primary/25',
        dimmed && 'opacity-40',
      )}
    >
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-1 bg-gradient-to-r',
          COURSE_TONES[hash(cell.name) % COURSE_TONES.length],
        )}
      />
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-semibold leading-snug" title={cell.name}>
          {cell.name}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {cell.weeklyHours != null && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {cell.weeklyHours} h
            </span>
          )}
          {changed && (
            <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
              Editado
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <Avatar teacher={teacher} />
        <div className="relative min-w-0 flex-1">
          <select
            aria-label={`${cell.name} de "${room.section}"`}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
            className={cn(
              'h-9 w-full cursor-pointer appearance-none truncate rounded-lg border border-transparent bg-muted/50 pl-2.5 pr-7 text-sm transition-colors hover:border-input focus:border-input focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/30',
              !value && 'text-amber-700 dark:text-amber-300',
            )}
          >
            <option value="" disabled={cell.hasGrades}>
              {cell.hasGrades ? 'Sin docente (tiene notas)' : 'Sin docente'}
            </option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {teacherName(t)}
                {cell.isTransversal && t.id === room.tutorTeacherId ? ' (tutor/a)' : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>
      {(cell.hasGrades || cell.isTransversal) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {cell.hasGrades && (
            <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300">
              Tiene notas
            </span>
          )}
          {cell.isTransversal && (
            <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
              Transversal
            </span>
          )}
        </div>
      )}
    </div>
  );
};
