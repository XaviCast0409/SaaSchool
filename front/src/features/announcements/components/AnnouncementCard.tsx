import React from 'react';
import { Bell, AlertTriangle, Info, Trash2, Calendar, BookOpen } from 'lucide-react';
import type { Announcement } from '../types';
import { useAuthStore } from '@/store/useAuthStore';

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
    (currentUser?.role === 'TEACHER' && announcement.authorId === currentUser.id);

  const getPriorityBadge = () => {
    switch (announcement.priority) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-destructive/15 text-destructive border border-destructive/20 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            URGENTE
          </span>
        );
      case 'IMPORTANT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Bell className="w-3.5 h-3.5" />
            IMPORTANTE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
            <Info className="w-3.5 h-3.5" />
            COMUNICADO
          </span>
        );
    }
  };

  const formattedDate = new Date(announcement.publishedAt).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="group relative rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {getPriorityBadge()}
          {announcement.classroom && (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground font-medium">
              <BookOpen className="w-3 h-3" />
              {announcement.classroom.grade}° "{announcement.classroom.section}" - {announcement.classroom.educationLevel}
            </span>
          )}
        </div>

        {canDelete && onDelete && (
          <button
            onClick={() => onDelete(announcement.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Eliminar comunicado"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <h3 className="text-lg font-bold text-foreground mb-2 leading-tight">
        {announcement.title}
      </h3>

      <p className="text-sm text-muted-foreground whitespace-pre-line mb-4 leading-relaxed">
        {announcement.content}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-border/50 text-xs text-muted-foreground">
        {announcement.author && (
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
              {announcement.author.firstName[0]}
            </div>
            <span className="font-medium text-foreground">
              {announcement.author.firstName} {announcement.author.lastNamePaternal}
            </span>
            <span className="text-muted-foreground">({announcement.author.role})</span>
          </div>
        )}

        <div className="flex items-center gap-1 ml-auto">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formattedDate}</span>
        </div>
      </div>
    </div>
  );
};
