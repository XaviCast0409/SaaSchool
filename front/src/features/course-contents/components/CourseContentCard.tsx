import React from 'react';
import {
  BookOpen,
  ClipboardList,
  MessageSquare,
  Download,
  Trash2,
  Calendar,
  FileText,
} from 'lucide-react';
import type { CourseContent } from '../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
  const isHomework = content.contentType === 'HOMEWORK';
  const isForum = content.contentType === 'FORUM';
  const isMaterial = content.contentType === 'LESSON_MATERIAL';

  const downloadUrl = content.fileUrl?.startsWith('http')
    ? content.fileUrl
    : `http://localhost:3000${content.fileUrl}`;

  return (
    <div className="p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all flex flex-col justify-between gap-3 text-xs">
      {/* Top Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isMaterial && (
              <Badge className="text-[10px] bg-primary/10 text-primary border border-primary/20 gap-1 font-bold">
                <BookOpen className="w-3 h-3" />
                <span>Material de Clase</span>
              </Badge>
            )}
            {isHomework && (
              <Badge className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 gap-1 font-bold">
                <ClipboardList className="w-3 h-3" />
                <span>Tarea Escolar</span>
              </Badge>
            )}
            {isForum && (
              <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 gap-1 font-bold">
                <MessageSquare className="w-3 h-3" />
                <span>Foro de Debate</span>
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px]">
              {content.bimester}° Bimestre
            </Badge>
          </div>

          {canManage && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(content.id)}
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Eliminar publicación"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Title & Description */}
        <h3 className="font-bold text-foreground text-sm leading-snug">{content.title}</h3>
        {content.description && (
          <p className="text-muted-foreground whitespace-pre-wrap line-clamp-3 leading-relaxed">
            {content.description}
          </p>
        )}
      </div>

      {/* Due Date for Homework */}
      {isHomework && content.dueDate && (
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold text-[11px]">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>
            Entrega hasta:{' '}
            {new Date(content.dueDate).toLocaleDateString('es-PE', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      )}

      {/* File Download Attachment */}
      {content.fileUrl && (
        <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
          <div className="flex items-center gap-2 overflow-hidden">
            <FileText className="w-4 h-4 text-primary shrink-0" />
            <div className="truncate">
              <p className="font-semibold text-foreground truncate">{content.fileName || 'Archivo adjunto'}</p>
              {content.fileSize && (
                <p className="text-[10px] text-muted-foreground">
                  {(content.fileSize / (1024 * 1024)).toFixed(2)} MB
                </p>
              )}
            </div>
          </div>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors shadow-sm shrink-0"
          >
            <Download className="w-3 h-3" />
            <span>Descargar</span>
          </a>
        </div>
      )}

      {/* Forum Discussion Action */}
      {isForum && onOpenForum && (
        <div className="pt-2 border-t border-border flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-medium">
            💬 {content._count?.comments || 0} respuestas de alumnos
          </span>
          <Button
            size="sm"
            onClick={() => onOpenForum(content)}
            className="gap-1.5 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Abrir Foro y Debatir</span>
          </Button>
        </div>
      )}
    </div>
  );
};
