import React, { useState } from 'react';
import {
  X,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  ExternalLink,
  Save,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useGetHomeworkSubmissions,
  useGradeHomeworkSubmission,
} from '../api/useCourseContents';
import { openFile } from '../utils/fileUrls';
import type {
  CourseContent,
  HomeworkTeacherSubmissionItem,
} from '../types';
import { formatPeruDateTime } from '@/lib/dateUtils';

interface HomeworkSubmissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: CourseContent | null;
}

interface GradeRowState {
  numericScore: string;
  literalScore: 'AD' | 'A' | 'B' | 'C' | 'EXO' | '';
  teacherFeedback: string;
}

export const HomeworkSubmissionsModal: React.FC<HomeworkSubmissionsModalProps> = ({
  isOpen,
  onClose,
  content,
}) => {
  const { data, isLoading, refetch } = useGetHomeworkSubmissions(content?.id);
  const gradeMutation = useGradeHomeworkSubmission();

  const [rowGrades, setRowGrades] = useState<Record<string, GradeRowState>>({});

  if (!isOpen || !content) return null;

  const items = data?.items || [];
  const totalStudents = data?.totalStudents || items.length;
  const submittedCount = data?.submittedCount || items.filter((i) => i.submission).length;
  const pendingCount = totalStudents - submittedCount;

  const getRowState = (item: HomeworkTeacherSubmissionItem): GradeRowState => {
    if (rowGrades[item.enrollmentId]) {
      return rowGrades[item.enrollmentId];
    }
    const sub = item.submission;
    return {
      numericScore:
        sub?.numericScore !== null && sub?.numericScore !== undefined
          ? String(sub.numericScore)
          : '',
      literalScore: sub?.literalScore || '',
      teacherFeedback: sub?.teacherFeedback || '',
    };
  };

  const handleFieldChange = (
    enrollmentId: string,
    field: keyof GradeRowState,
    value: string,
  ) => {
    setRowGrades((prev) => ({
      ...prev,
      [enrollmentId]: {
        ...(prev[enrollmentId] || {
          numericScore: '',
          literalScore: '',
          teacherFeedback: '',
        }),
        [field]: value,
      },
    }));
  };

  const handleSaveGrade = async (item: HomeworkTeacherSubmissionItem) => {
    if (!item.submission) {
      toast.warning('El estudiante aún no ha enviado su tarea.');
      return;
    }

    const currentState = getRowState(item);
    const num =
      currentState.numericScore.trim() !== ''
        ? parseFloat(currentState.numericScore)
        : null;

    if (num !== null && (isNaN(num) || num < 0 || num > 20)) {
      toast.error('La calificación vigesimal debe estar entre 0 y 20.');
      return;
    }

    try {
      await gradeMutation.mutateAsync({
        submissionId: item.submission.id,
        courseContentId: content.id,
        payload: {
          numericScore: num,
          literalScore:
            currentState.literalScore !== ''
              ? currentState.literalScore
              : null,
          teacherFeedback: currentState.teacherFeedback.trim() || undefined,
        },
      });

      toast.success('Calificación guardada con éxito.');
      refetch();
    } catch {
      toast.error('Error al guardar la calificación de la tarea.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-4xl max-h-[90vh] rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-muted/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ClipboardList className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Entregas de Tarea: {content.title}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              {content.dueDate
                ? `Fecha Límite: ${formatPeruDateTime(content.dueDate, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}`
                : 'Sin fecha límite especificada'}
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-xl h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* KPIs de Entregas */}
        <div className="grid grid-cols-3 gap-2 p-3 sm:p-4 border-b border-border bg-muted/15 text-xs">
          <div className="p-2.5 rounded-xl bg-card border border-border flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <div>
              <span className="text-muted-foreground block text-[10px]">Total Alumnos</span>
              <span className="font-bold text-foreground text-sm">{totalStudents}</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-card border border-border flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <span className="text-muted-foreground block text-[10px]">Entregaron</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                {submittedCount}
              </span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-card border border-border flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="text-muted-foreground block text-[10px]">Pendientes</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                {pendingCount}
              </span>
            </div>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <FileText className="w-10 h-10 mx-auto opacity-30" />
              <p className="text-sm font-semibold text-foreground">
                No hay alumnos registrados en esta sección
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const sub = item.submission;
                const state = getRowState(item);
                const fullName = `${item.student.lastNamePaternal} ${item.student.lastNameMaternal || ''}, ${item.student.firstNames}`.trim();

                return (
                  <div
                    key={item.enrollmentId}
                    className="p-3 sm:p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs"
                  >
                    {/* Info Alumno */}
                    <div className="min-w-0 md:w-1/3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm truncate">
                          {fullName}
                        </span>
                        {sub?.isLate ? (
                          <Badge
                            variant="destructive"
                            className="text-[9px] uppercase font-bold px-1.5 py-0"
                          >
                            Fuera de fecha
                          </Badge>
                        ) : sub ? (
                          <Badge
                            variant="outline"
                            className="text-[9px] font-bold px-1.5 py-0 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          >
                            A tiempo
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[9px] font-bold px-1.5 py-0 text-muted-foreground"
                          >
                            Pendiente
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        DNI: {item.student.documentId}
                        {sub && (
                          <span>
                            {' '}
                            • Entregado:{' '}
                            {formatPeruDateTime(sub.submittedAt, {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                        )}
                      </div>

                      {/* Archivo adjunto por el estudiante */}
                      {sub?.fileUrl && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void openFile(sub.fileUrl, { download: true })}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline truncate"
                          >
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{sub.fileName}</span>
                          </button>
                        </div>
                      )}

                      {/* Comentario del estudiante */}
                      {sub?.studentComment && (
                        <p className="mt-1 text-[11px] text-muted-foreground italic bg-muted/30 p-1.5 rounded-lg border border-border/50">
                          "{sub.studentComment}"
                        </p>
                      )}
                    </div>

                    {/* Controles de Calificación */}
                    {sub ? (
                      <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-end">
                        {/* Nota Numérica (0-20) */}
                        <div className="w-20">
                          <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">
                            Nota (0-20)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            step="0.5"
                            value={state.numericScore}
                            onChange={(e) =>
                              handleFieldChange(
                                item.enrollmentId,
                                'numericScore',
                                e.target.value,
                              )
                            }
                            placeholder="0-20"
                            className="w-full h-8 px-2 text-center font-mono font-bold text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        {/* Nota Literal (AD, A, B, C, EXO) */}
                        <div className="w-24">
                          <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">
                            SIAGIE
                          </label>
                          <select
                            value={state.literalScore}
                            onChange={(e) =>
                              handleFieldChange(
                                item.enrollmentId,
                                'literalScore',
                                e.target.value as any,
                              )
                            }
                            className="w-full h-8 px-1.5 font-bold text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="">—</option>
                            <option value="AD">AD</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="EXO">EXO</option>
                          </select>
                        </div>

                        {/* Feedback / Comentario del Docente */}
                        <div className="flex-1 min-w-[140px]">
                          <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">
                            Retroalimentación
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={state.teacherFeedback}
                              onChange={(e) =>
                                handleFieldChange(
                                  item.enrollmentId,
                                  'teacherFeedback',
                                  e.target.value,
                                )
                              }
                              placeholder="Buen trabajo / Revisar punto 2..."
                              className="w-full h-8 px-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground absolute right-2 top-2 pointer-events-none" />
                          </div>
                        </div>

                        {/* Botón Guardar en 1 Clic */}
                        <div className="self-end sm:self-auto pt-4 sm:pt-4">
                          <Button
                            size="sm"
                            onClick={() => handleSaveGrade(item)}
                            disabled={gradeMutation.isPending}
                            className="h-8 gap-1.5 text-xs font-bold rounded-lg shadow-xs"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Guardar</span>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-right text-xs text-muted-foreground italic py-2">
                        Sin entrega registrada
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-muted/40 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-semibold">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};

