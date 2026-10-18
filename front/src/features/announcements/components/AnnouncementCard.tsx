import React from 'react';
import {
  Bell,
  AlertTriangle,
  Info,
  Trash2,
  Calendar,
  School,
} from 'lucide-react';
import type { Announcement } from '../types';
import { useAuthStore } from '@/store/useAuthStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AnnouncementCardProps {
  announcement: Announcement;
  onDelete?: (id: string) => void;
}

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  announcement,
  onDelete,
}) => {
  const currentUser = useAuthStore((state) => state.user);
  const canDelete =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'SCHOOL_ADMIN' ||
    currentUser?.role === 'ADMINISTRATIVE' ||
    (currentUser?.role === 'TEACHER' && announcement.authorId === currentUser.id);

  const isUrgent = announcement.priority === 'URGENT';
  const isImportant = announcement.priority === 'IMPORTANT';

  const borderAccentClass = isUrgent
    ? 'border-l-4 border-l-destructive shadow-sm'
    : isImportant
    ? 'border-l-4 border-l-amber-500 shadow-sm'
    : 'border-l-4 border-l-primary/50 shadow-sm';

  const formattedDate = new Date(announcement.publishedAt).toLocaleDateString('es-PE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`group relative rounded-2xl border border-border bg-card p-5 sm:p-6 hover:shadow-md transition-all duration-200 ${borderAccentClass}`}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {isUrgent ? (
            <Badge className="bg-destructive/15 text-destructive border-destructive/30 font-black text-xs gap-1 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>COMUNICADO URGENTE</span>
            </Badge>
          ) : isImportant ? (
            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-black text-xs gap-1">
              <Bell className="w-3.5 h-3.5" />
              <span>IMPORTANTE</span>
            </Badge>
          ) : (
            <Badge className="bg-primary/10 text-primary border-primary/20 font-bold text-xs gap-1">
              <Info className="w-3.5 h-3.5" />
              <span>COMUNICADO OFICIAL</span>
            </Badge>
          )}

          {announcement.classroom && (
            <Badge variant="outline" className="text-xs font-semibold gap-1 bg-secondary/40 text-foreground border-border">
              <School className="w-3.5 h-3.5 text-primary" />
              <span>{announcement.classroom.grade}° "{announcement.classroom.section}" • {announcement.classroom.educationLevel}</span>
            </Badge>
          )}
        </div>

        {canDelete && onDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(announcement.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
            title="Eliminar comunicado"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Title */}
      <h3 className="text-base sm:text-lg font-black text-foreground mb-2 leading-snug tracking-tight">
        {announcement.title}
      </h3>

      {/* Content */}
      <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line mb-4 leading-relaxed">
        {announcement.content}
      </p>

      {/* Footer Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60 text-xs text-muted-foreground">
        {announcement.author && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-[10px] shrink-0 border border-primary/20">
              {announcement.author.firstName[0]}
            </div>
            <span className="font-bold text-foreground">
              {announcement.author.firstName} {announcement.author.lastNamePaternal}
            </span>
            <span className="text-[11px] text-muted-foreground">
              • {announcement.author.role === 'TEACHER' ? 'Docente de Aula' : 'Dirección Escolar'}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 ml-auto text-[11px] text-muted-foreground font-medium">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <span>{formattedDate}</span>
        </div>
      </div>
    </div>
  );
};
