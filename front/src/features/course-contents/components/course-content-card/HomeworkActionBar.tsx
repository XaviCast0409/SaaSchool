import React from 'react';
import { UploadCloud, Users, Award, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { HomeworkSubmission } from '../../types';

interface HomeworkActionBarProps {
  isTeacherOrAdmin: boolean;
  submissionsData: {
    submission?: HomeworkSubmission | null;
    submissions?: HomeworkSubmission[];
    submittedCount?: number;
    totalStudents?: number;
  } | undefined;
  onOpenTeacherSubmissions: () => void;
  onOpenStudentSubmit: () => void;
}

export const HomeworkActionBar: React.FC<HomeworkActionBarProps> = ({
  isTeacherOrAdmin,
  submissionsData,
  onOpenTeacherSubmissions,
  onOpenStudentSubmit,
}) => {
  const studentSubmission =
    submissionsData?.submission || (submissionsData?.submissions && submissionsData.submissions[0]) || null;
  const isGraded = !!studentSubmission?.gradedAt;

  if (isTeacherOrAdmin) {
    return (
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Users className="w-4 h-4 text-primary" />
          <span>
            {submissionsData?.submittedCount ?? 0} de {submissionsData?.totalStudents ?? 0} alumnos entregaron
          </span>
        </div>
        <Button
          size="sm"
          onClick={onOpenTeacherSubmissions}
          className="gap-1.5 h-7 px-3 text-xs font-bold rounded-lg shadow-xs"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Ver Entregas</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        {isGraded ? (
          <Badge className="text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1">
            <Award className="w-3 h-3" />
            <span>
              Calificado:{' '}
              {studentSubmission?.literalScore ||
                (studentSubmission?.numericScore !== null && studentSubmission?.numericScore !== undefined
                  ? `${studentSubmission.numericScore}/20`
                  : 'Revisada')}
            </span>
          </Badge>
        ) : studentSubmission?.isLate ? (
          <Badge variant="destructive" className="text-xs font-bold">
            Entregado fuera de fecha
          </Badge>
        ) : studentSubmission ? (
          <Badge
            variant="outline"
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1"
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Entregado a tiempo</span>
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-xs font-bold text-amber-600 dark:text-amber-400 border-amber-500/30"
          >
            Pendiente
          </Badge>
        )}
      </div>

      <Button
        size="sm"
        onClick={onOpenStudentSubmit}
        className="gap-1.5 h-7 px-2.5 text-xs font-bold rounded-lg"
      >
        <UploadCloud className="w-3.5 h-3.5" />
        <span>{studentSubmission ? 'Ver Mi Entrega' : 'Subir mi Tarea'}</span>
      </Button>
    </div>
  );
};
