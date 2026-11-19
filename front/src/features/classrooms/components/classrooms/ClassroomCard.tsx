import React from 'react';
import { DoorClosed, DoorOpen, Pencil, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Classroom } from '../../types';
import { SHIFT_LABEL, roomLabel, type Shift, type TeacherOption } from './constants';
import { TutorSelect } from './TutorSelect';

export interface ClassroomCardProps {
  classroom: Classroom;
  isAdmin: boolean;
  viewedYear?: { id: string; year: number } | null;
  teachers: Array<TeacherOption & { tutorOfLabel?: string }>;
  isSectionPending: boolean;
  isTutorPending: boolean;
  onToggleOpen: (c: Classroom) => void;
  onEdit: (c: Classroom) => void;
  onDelete: (c: Classroom) => void;
  onChangeTutor: (c: Classroom, tutorTeacherId: string | null) => void;
}

export const ClassroomCard: React.FC<ClassroomCardProps> = ({
  classroom: c,
  isAdmin,
  viewedYear,
  teachers,
  isSectionPending,
  isTutorPending,
  onToggleOpen,
  onEdit,
  onDelete,
  onChangeTutor,
}) => {
  const enrolled = c.enrolledCount ?? 0;
  const pct = c.capacity > 0 ? Math.round((enrolled / c.capacity) * 100) : 0;

  return (
    <div
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
              disabled={isSectionPending}
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
              onClick={() => onToggleOpen(c)}
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
              onClick={() => onEdit(c)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              aria-label={`Eliminar ${roomLabel(c)}`}
              onClick={() => onDelete(c)}
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
            disabled={isTutorPending}
            onChange={(id) => onChangeTutor(c, id)}
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
};
