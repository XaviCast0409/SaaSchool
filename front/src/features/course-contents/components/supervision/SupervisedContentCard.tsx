import React, { useState } from 'react';
import {
  MessageSquare,
  Trash2,
  Clock,
  User,
  Paperclip,
  Eye,
  Download,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getSubjectTheme } from '../../utils/subjectThemes';
import { getDirectDownloadUrl } from '../../utils/fileUrls';
import { DocumentPreviewModal } from '../DocumentPreviewModal';
import type { SupervisedContentItem } from '../../types';

interface SupervisedContentCardProps {
  item: SupervisedContentItem;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes === 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export const SupervisedContentCard: React.FC<SupervisedContentCardProps> = ({
  item,
  onDelete,
  isDeleting,
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const theme = getSubjectTheme(item.courseAssignment.area.name);
  const downloadUrl = getDirectDownloadUrl(item.fileUrl);

  const typeConfig = {
    LESSON_MATERIAL: {
      label: 'Material de Clase',
      badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    },
    HOMEWORK: {
      label: 'Tarea / Actividad',
      badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    },
    FORUM: {
      label: 'Foro de Debate',
      badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
    },
  }[item.contentType];

  return (
    <Card className="p-4 bg-card border-border hover:shadow-sm transition-all flex flex-col justify-between gap-3">
      <div className="space-y-2.5">
        {/* Cabecera con Badges contextuales */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className={`text-[10px] font-bold py-0 h-4 ${theme.badgeStyle}`}>
              {item.courseAssignment.classroom.grade}° "{item.courseAssignment.classroom.section}"
            </Badge>
            <Badge variant="outline" className="text-[10px] font-bold py-0 h-4 border-border text-muted-foreground">
              {item.courseAssignment.area.name}
            </Badge>
            <Badge variant="outline" className={`text-[10px] font-bold py-0 h-4 ${typeConfig.badgeClass}`}>
              {typeConfig.label}
            </Badge>
          </div>

          <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
            {item.bimester}° Bim
          </span>
        </div>

        {/* Título y Descripción */}
        <div>
          <h4 className="text-sm font-bold text-foreground leading-snug line-clamp-1">
            {item.title}
          </h4>
          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* Archivo adjunto (Directo a Google Drive) */}
        {item.fileUrl && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/80">
            <div className="flex items-center gap-2 min-w-0">
              <Paperclip className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-xs font-semibold text-foreground truncate max-w-[200px]" title={item.fileName || 'Archivo adjunto'}>
                {item.fileName || 'Archivo adjunto'}
              </span>
              {item.fileSize && (
                <span className="text-[10px] text-muted-foreground shrink-0">
                  ({formatBytes(item.fileSize)})
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline px-1 py-0.5"
              >
                <Eye className="w-3 h-3" />
                <span>Ver Archivo</span>
              </button>
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Descargar archivo a tu dispositivo"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Fecha de Entrega si es Tarea */}
        {item.contentType === 'HOMEWORK' && item.dueDate && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Entrega: {new Date(item.dueDate).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}</span>
          </div>
        )}

        {/* Comentarios si es Foro */}
        {item.contentType === 'FORUM' && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span>{item._count?.comments || 0} intervenciones de alumnos</span>
          </div>
        )}
      </div>

      {/* Footer: Datos del docente autor y acciones */}
      <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 truncate">
          <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="truncate font-semibold text-foreground">
            Prof. {item.teacher.lastNamePaternal} {item.teacher.firstName}
          </span>
          <span className="text-[11px] text-muted-foreground shrink-0">
            • {new Date(item.createdAt).toLocaleDateString('es-PE')}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(item.id)}
          disabled={isDeleting}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 shrink-0 rounded-lg"
          title="Eliminar publicación (Moderación)"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        fileUrl={item.fileUrl}
        fileName={item.fileName}
        title={item.title}
      />
    </Card>
  );
};
