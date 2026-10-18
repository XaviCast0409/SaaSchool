import React, { useState } from 'react';
import {
  BookOpen,
  ClipboardList,
  MessageSquare,
  Download,
  Trash2,
  Calendar,
  Cloud,
  Clock,
  Sparkles,
  Eye,
} from 'lucide-react';
import type { CourseContent } from '../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getDirectDownloadUrl, isGoogleDriveUrl } from '../utils/fileUrls';
import { getFileMetadata, getDueDateStatus, formatFileSize } from '../utils/fileHelpers';
import { DocumentPreviewModal } from './DocumentPreviewModal';

interface CourseContentCardProps {
  content: CourseContent;
  onOpenForum?: (content: CourseContent) => void;
  onDelete?: (id: string) => void;
  canManage?: boolean;
}

export const CourseContentCard: React.FC<CourseContentCardProps> = ({
  content,
  onOpenForum,
  onDelete,
  canManage = false,
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const isHomework = content.contentType === 'HOMEWORK';
  const isForum = content.contentType === 'FORUM';
  const isMaterial = content.contentType === 'LESSON_MATERIAL';

  const downloadUrl = getDirectDownloadUrl(content.fileUrl);
  const isDrive = isGoogleDriveUrl(content.fileUrl);
  const fileMeta = getFileMetadata(content.fileName, content.fileType);
  const FileIcon = fileMeta.icon;
  const dueDateStatus = getDueDateStatus(content.dueDate);

  const formattedDate = new Date(content.createdAt).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 text-xs">
      {/* Top Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isMaterial && (
              <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 gap-1 font-bold">
                <BookOpen className="w-3 h-3" />
                <span>Material de Clase</span>
              </Badge>
            )}
            {isHomework && (
              <Badge className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 gap-1 font-bold">
                <ClipboardList className="w-3 h-3" />
                <span>Tarea Escolar</span>
              </Badge>
            )}
            {isForum && (
              <Badge className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 gap-1 font-bold">
                <MessageSquare className="w-3 h-3" />
                <span>Foro de Debate</span>
              </Badge>
            )}

            <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground">
              {content.bimester}° Bimestre
            </Badge>

            <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
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
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="font-extrabold text-foreground text-sm sm:text-base leading-snug">
            {content.title}
          </h3>
          {content.description && (
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed mt-1 text-xs">
              {content.description}
            </p>
          )}
        </div>
      </div>

      {/* Tarea: Alerta de fecha límite con cálculo de urgencia */}
      {isHomework && dueDateStatus && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-200 font-semibold text-xs">
            <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Entrega: {dueDateStatus.formattedDate}</span>
          </div>
          <Badge className={`text-[10px] font-bold ${dueDateStatus.urgencyBadge}`}>
            {dueDateStatus.urgencyLabel}
          </Badge>
        </div>
      )}

      {/* Archivo Adjunto (Google Drive 5TB o Local) con Descarga Directa en 1 Clic */}
      {content.fileUrl && (
        <div className="p-3 rounded-xl border border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center shrink-0 shadow-sm text-primary">
              <FileIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-foreground truncate text-xs">
                {content.fileName || 'Archivo adjunto de clase'}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap mt-0.5">
                <Badge variant="outline" className={`py-0 h-4 text-[9px] font-bold ${fileMeta.badgeStyle}`}>
                  {fileMeta.label}
                </Badge>
                {isDrive && (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                    <Cloud className="w-3 h-3" />
                    <span>Enlace Cloud</span>
                  </span>
                )}
                {content.fileSize && (
                  <span>• {formatFileSize(content.fileSize)}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {/* Opción 1: Ver Archivo directamente en visor interactivo */}
            <Button
              type="button"
              size="sm"
              onClick={() => setIsPreviewOpen(true)}
              className="flex-1 sm:flex-none gap-1.5 h-9 px-3.5 text-xs font-bold rounded-xl shadow-xs"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Ver Archivo</span>
            </Button>

            {/* Opción Descarga: Descargar archivo directamente */}
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-input bg-card hover:bg-muted text-foreground font-bold transition-all text-xs shrink-0"
              title="Descargar archivo a tu dispositivo"
            >
              <Download className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Descargar</span>
            </a>
          </div>
        </div>
      )}

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
    </div>
  );
};
