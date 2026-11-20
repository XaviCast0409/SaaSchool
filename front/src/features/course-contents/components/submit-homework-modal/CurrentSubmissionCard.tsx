import React from 'react';
import { CheckCircle2, Clock, FileText, ExternalLink, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatPeruDateTime } from '@/lib/dateUtils';
import { openFile } from '../../utils/fileUrls';
import type { HomeworkSubmission } from '../../types';

interface CurrentSubmissionCardProps {
  currentSubmission: HomeworkSubmission;
  isGraded: boolean;
}

export const CurrentSubmissionCard: React.FC<CurrentSubmissionCardProps> = ({ currentSubmission, isGraded }) => {
  return (
    <div className="space-y-3">
      <div className="p-4 rounded-xl border border-border bg-card space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-foreground text-sm">
              {isGraded ? 'Tarea Calificada' : 'Tarea Entregada'}
            </span>
          </div>

          {currentSubmission.isLate ? (
            <Badge variant="destructive" className="text-xs font-bold">
              Fuera de fecha
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
            >
              A tiempo
            </Badge>
          )}
        </div>

        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>
            Enviado:{' '}
            {formatPeruDateTime(currentSubmission.submittedAt, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </span>
        </div>

        {/* Archivo enviado */}
        <div className="p-2.5 rounded-lg bg-muted/40 border border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <FileText className="w-4 h-4 text-primary shrink-0" />
            <span className="font-bold text-foreground truncate">{currentSubmission.fileName}</span>
          </div>
          <button
            type="button"
            onClick={() => void openFile(currentSubmission.fileUrl, { download: true })}
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline shrink-0"
          >
            <span>Ver</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Comentario del estudiante */}
        {currentSubmission.studentComment && (
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold block text-foreground">Tu comentario:</span>
            <p className="italic">"{currentSubmission.studentComment}"</p>
          </div>
        )}

        {/* Calificación y Retroalimentación del Docente */}
        {isGraded && (
          <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2 mt-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-primary text-xs">
                <Award className="w-4 h-4" />
                <span>Calificación Docente</span>
              </div>
              <Badge className="text-xs font-mono font-extrabold px-2 py-0.5">
                {currentSubmission.literalScore ||
                  (currentSubmission.numericScore !== null && currentSubmission.numericScore !== undefined
                    ? `${currentSubmission.numericScore} / 20`
                    : 'Revisada')}
              </Badge>
            </div>

            {currentSubmission.teacherFeedback && (
              <div className="text-xs text-foreground bg-card p-2.5 rounded-lg border border-border/60">
                <span className="font-semibold text-muted-foreground block text-xs uppercase tracking-wide">
                  Comentario del Profesor:
                </span>
                <p className="mt-0.5 leading-relaxed">{currentSubmission.teacherFeedback}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {!isGraded && (
        <div className="text-xs text-muted-foreground text-center">
          ¿Necesitas corregir tu entrega? Puedes subir un nuevo archivo a continuación.
        </div>
      )}
    </div>
  );
};
