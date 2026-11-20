import React, { memo, useState } from 'react';
import { usePeriods } from '@/features/academic-years/api/useAcademicYears';
import {
  BookOpen,
  ClipboardList,
  MessageSquare,
  Trash2,
  Calendar,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { CourseContent } from '../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getDueDateStatus } from '../utils/fileHelpers';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { HomeworkSubmissionsModal } from './HomeworkSubmissionsModal';
import { SubmitHomeworkModal } from './SubmitHomeworkModal';
import { useGetHomeworkSubmissions } from '../api/useCourseContents';
import { useAuthStore } from '@/store/useAuthStore';
import { formatPeruDate } from '@/lib/dateUtils';
import { ContentAttachmentList } from './course-content-card/ContentAttachmentList';
import { HomeworkActionBar } from './course-content-card/HomeworkActionBar';

interface CourseContentCardProps {
  content: CourseContent;
  onOpenForum?: (content: CourseContent) => void;
  onDelete?: (id: string) => void;
  onViewSubmissions?: (content: CourseContent) => void;
  onSubmitHomework?: (content: CourseContent) => void;
  canManage?: boolean;
}

export const CourseContentCard: React.FC<CourseContentCardProps> = memo(({
  content,
  onOpenForum,
  onDelete,
  onViewSubmissions,
  onSubmitHomework,
  canManage = false,
}) => {
  const { label: periodLabel } = usePeriods();
  const { user } = useAuthStore();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmissionsModalOpen, setIsSubmissionsModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  const isHomework = content.contentType === 'HOMEWORK';
  const isForum = content.contentType === 'FORUM';
  const isMaterial = content.contentType === 'LESSON_MATERIAL';

  const isTeacherOrAdmin =
    canManage || user?.role === 'TEACHER' || user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';

  // Solo consultar submissions si es de tipo tarea
  const { data: submissionsData } = useGetHomeworkSubmissions(isHomework ? content.id : null);
  const dueDateStatus = getDueDateStatus(content.dueDate);

  const formattedDate = formatPeruDate(content.createdAt, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const handleOpenTeacherSubmissions = () => {
    if (onViewSubmissions) {
      onViewSubmissions(content);
    } else {
      setIsSubmissionsModalOpen(true);
    }
  };

  const handleOpenStudentSubmit = () => {
    if (onSubmitHomework) {
      onSubmitHomework(content);
    } else {
      setIsSubmitModalOpen(true);
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 text-xs">
      {/* Top Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isMaterial && (
              <Badge className="text-xs bg-primary/10 text-primary border-primary/20 gap-1 font-bold">
                <BookOpen className="w-3 h-3" />
                <span>Material de Clase</span>
              </Badge>
            )}
            {isHomework && (
              <Badge className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 gap-1 font-bold">
                <ClipboardList className="w-3 h-3" />
                <span>Tarea Escolar</span>
              </Badge>
            )}
            {isForum && (
              <Badge className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 gap-1 font-bold">
                <MessageSquare className="w-3 h-3" />
                <span>Foro de Debate</span>
              </Badge>
            )}

            <Badge variant="outline" className="text-xs font-semibold text-muted-foreground">
              {content.bimester}° {periodLabel}
            </Badge>

            <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
              <Clock className="w-3 h-3" />
              <span>{formattedDate}</span>
            </span>
          </div>

          {canManage && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(content.id)}
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
              title="Eliminar publicación"
              aria-label="Eliminar publicación"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="font-extrabold text-foreground text-sm sm:text-base leading-snug">{content.title}</h3>
          {content.description && (
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed mt-1 text-xs">
              {content.description}
            </p>
          )}
        </div>
      </div>

      {/* Tarea: Alerta de fecha límite y estado de entrega */}
      {isHomework && (
        <div className="space-y-2">
          {dueDateStatus && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-200 font-semibold text-xs">
                <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Entrega: {dueDateStatus.formattedDate}</span>
              </div>
              <Badge className={`text-xs font-bold ${dueDateStatus.urgencyBadge}`}>{dueDateStatus.urgencyLabel}</Badge>
            </div>
          )}

          <HomeworkActionBar
            isTeacherOrAdmin={isTeacherOrAdmin}
            submissionsData={submissionsData}
            onOpenTeacherSubmissions={handleOpenTeacherSubmissions}
            onOpenStudentSubmit={handleOpenStudentSubmit}
          />
        </div>
      )}

      {/* Archivo adjunto */}
      <ContentAttachmentList
        fileUrl={content.fileUrl}
        fileName={content.fileName}
        fileType={content.fileType}
        fileSize={content.fileSize}
        onPreview={() => setIsPreviewOpen(true)}
      />

      {/* Foro de Debate Interactivo */}
      {isForum && onOpenForum && (
        <div className="pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              {content._count?.comments || 0}{' '}
              {content._count?.comments === 1 ? 'comentario de estudiantes' : 'comentarios de estudiantes'}
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => onOpenForum(content)}
            className="gap-1.5 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm h-8"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Participar y Debatir</span>
          </Button>
        </div>
      )}

      {/* Modal de Vista Previa Interactiva */}
      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        fileUrl={content.fileUrl}
        fileName={content.fileName}
        title={content.title}
      />

      {/* Modal de Entregas (Docente) */}
      <HomeworkSubmissionsModal
        isOpen={isSubmissionsModalOpen}
        onClose={() => setIsSubmissionsModalOpen(false)}
        content={content}
      />

      {/* Modal de Entrega (Estudiante / Apoderado) */}
      <SubmitHomeworkModal isOpen={isSubmitModalOpen} onClose={() => setIsSubmitModalOpen(false)} content={content} />
    </div>
  );
});
