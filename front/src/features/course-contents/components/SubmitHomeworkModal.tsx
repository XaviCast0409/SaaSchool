import React, { useState } from 'react';
import {
  X,
  ClipboardList,
  Upload,
  Calendar,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetHomeworkSubmissions, useSubmitHomework, useUploadMaterial } from '../api/useCourseContents';
import type { CourseContent } from '../types';
import { useAuthStore } from '@/store/useAuthStore';
import { useParentStore } from '@/store/useParentStore';
import { formatPeruDateTime } from '@/lib/dateUtils';
import { CurrentSubmissionCard } from './submit-homework-modal/CurrentSubmissionCard';

interface SubmitHomeworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: CourseContent | null;
}

export const SubmitHomeworkModal: React.FC<SubmitHomeworkModalProps> = ({ isOpen, onClose, content }) => {
  const { data, isLoading, refetch } = useGetHomeworkSubmissions(content?.id);
  const uploadMutation = useUploadMaterial();
  const submitMutation = useSubmitHomework();
  const { user } = useAuthStore();
  const { selectedChildId } = useParentStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [comment, setComment] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen || !content) return null;

  const currentSubmission = data?.submission || (data?.submissions && data.submissions[0]) || null;
  const isGraded = !!currentSubmission?.gradedAt;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !currentSubmission) {
      toast.warning('Por favor selecciona un archivo para tu entrega.');
      return;
    }

    try {
      setIsUploading(true);

      let fileUrl = currentSubmission?.fileUrl || '';
      let fileName = currentSubmission?.fileName || '';
      let fileSize = currentSubmission?.fileSize || undefined;

      if (selectedFile) {
        const uploaded = await uploadMutation.mutateAsync(selectedFile);
        fileUrl = uploaded.url;
        fileName = uploaded.fileName;
        fileSize = uploaded.fileSize;
      }

      const resolvedStudentId = user?.role === 'STUDENT' ? user.studentId || user.id : selectedChildId || undefined;

      await submitMutation.mutateAsync({
        courseContentId: content.id,
        payload: {
          studentId: resolvedStudentId,
          fileUrl,
          fileName,
          fileSize,
          studentComment: comment.trim() || undefined,
        },
      });

      toast.success('¡Tarea entregada con éxito!');
      setSelectedFile(null);
      setComment('');
      refetch();
    } catch {
      toast.error('Error al entregar la tarea. Por favor reintenta.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-muted/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <ClipboardList className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">Entrega de Tarea</h2>
            </div>
            <p className="text-xs text-muted-foreground truncate max-w-sm">{content.title}</p>
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

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Info de la tarea */}
          <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-2">
            <h3 className="font-bold text-foreground text-sm">{content.title}</h3>
            {content.description && (
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{content.description}</p>
            )}

            {content.dueDate && (
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold pt-1">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Fecha límite:{' '}
                  {formatPeruDateTime(content.dueDate, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : currentSubmission ? (
            <CurrentSubmissionCard currentSubmission={currentSubmission} isGraded={isGraded} />
          ) : (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Aún no has enviado esta tarea. Adjunta tu archivo antes de la fecha límite.</span>
            </div>
          )}

          {/* Formulario de Entrega */}
          {!isGraded && (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">
                  {currentSubmission ? 'Reemplazar Archivo' : 'Seleccionar Archivo (PDF, Word, Imagen, etc.)'}
                </label>
                <div className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl p-4 text-center cursor-pointer bg-muted/15 relative">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                    <Upload className="w-6 h-6 text-primary" />
                    {selectedFile ? (
                      <span className="font-bold text-foreground text-xs">{selectedFile.name}</span>
                    ) : (
                      <>
                        <span className="font-semibold text-xs text-foreground">Haz clic para elegir un archivo</span>
                        <span className="text-xs">Límite máximo: 15 MB</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">
                  Comentario para el profesor (Opcional)
                </label>
                <div className="relative">
                  <textarea
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Profesor, adjunto la resolución del ejercicio 4..."
                    className="w-full p-2.5 text-xs rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <MessageSquare className="w-3.5 h-3.5 text-muted-foreground absolute right-3 bottom-3 pointer-events-none" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isUploading || (!selectedFile && !currentSubmission)}
                className="w-full h-9 font-bold text-xs gap-2 rounded-xl shadow-sm"
              >
                {isUploading ? (
                  <>
                    <span className="animate-spin w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full" />
                    <span>Subiendo archivo y enviando...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>{currentSubmission ? 'Actualizar mi Entrega' : 'Subir mi Tarea'}</span>
                  </>
                )}
              </Button>
            </form>
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
