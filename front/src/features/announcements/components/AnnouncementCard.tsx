import React from 'react';
import {
  Bell,
  AlertTriangle,
  Info,
  Trash2,
  Calendar,
  School,
  CalendarClock,
  Archive,
} from 'lucide-react';
import type { Announcement } from '../types';
import { useAuthStore } from '@/store/useAuthStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPeruDate } from '@/lib/dateUtils';
import { AnnouncementResponsePanel } from './AnnouncementResponsePanel';
import { useUpdateAnnouncementExpiry } from '../api/useAnnouncements';
import { endOfDayLima, limaDateOf, addDays } from '../lib/expiry';
import { getPeruToday } from '@/lib/dateUtils';
import { toast } from 'sonner';
import { formatEducationLevel } from '@/lib/utils';

interface AnnouncementCardProps {
  announcement: Announcement;
  onDelete?: (id: string) => void;
  /** Se muestra en la pestaña "Anteriores": ya no está vigente. */
  isPast?: boolean;
}

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  announcement,
  onDelete,
  isPast = false,
}) => {
  const currentUser = useAuthStore((state) => state.user);
  const canDelete =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'SCHOOL_ADMIN' ||
    currentUser?.role === 'ADMINISTRATIVE' ||
    (currentUser?.role === 'TEACHER' && announcement.authorId === currentUser.id);

  // Misma regla que eliminar: Dirección, Secretaría o el docente autor
  const canEditExpiry = canDelete && currentUser?.role !== 'SUPER_ADMIN';
  const [editingExpiry, setEditingExpiry] = React.useState(false);
  const today = getPeruToday();
  const [expiryDate, setExpiryDate] = React.useState('');
  const { mutateAsync: updateExpiry, isPending: savingExpiry } = useUpdateAnnouncementExpiry();

  const openExpiryEditor = () => {
    const current = announcement.expiresAt ? limaDateOf(announcement.expiresAt) : '';
    setExpiryDate(current && current >= today ? current : addDays(today, 7));
    setEditingExpiry(true);
  };

  const saveExpiry = async (expiresAt: string | null, okMessage: string) => {
    try {
      await updateExpiry({ id: announcement.id, expiresAt });
      toast.success(okMessage);
      setEditingExpiry(false);
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'No se pudo cambiar la vigencia.');
    }
  };

  const endsLabel = announcement.endsAt
    ? formatPeruDate(announcement.endsAt, { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const isUrgent = announcement.priority === 'URGENT';
  const isImportant = announcement.priority === 'IMPORTANT';

  const borderAccentClass = isPast
    ? 'border-l-4 border-l-muted-foreground/30'
    : isUrgent
    ? 'border-l-4 border-l-destructive shadow-sm'
    : isImportant
    ? 'border-l-4 border-l-amber-500 shadow-sm'
    : 'border-l-4 border-l-primary/50 shadow-sm';

  const formattedDate = formatPeruDate(announcement.publishedAt, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`group relative rounded-2xl border border-border p-5 sm:p-6 hover:shadow-md transition-all duration-200 ${borderAccentClass} ${
        isPast ? 'bg-muted/30' : 'bg-card'
      }`}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {isUrgent ? (
            <Badge className={`bg-destructive/15 text-destructive border-destructive/30 font-black text-xs gap-1 ${isPast ? '' : 'animate-pulse'}`}>
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
              <span>{announcement.classroom.grade}° "{announcement.classroom.section}" • {formatEducationLevel(announcement.classroom.educationLevel)}</span>
            </Badge>
          )}

          {isPast && endsLabel ? (
            <Badge variant="outline" className="text-xs font-semibold gap-1 bg-muted text-muted-foreground border-border">
              <Archive className="w-3.5 h-3.5" />
              <span>Venció el {endsLabel}</span>
            </Badge>
          ) : announcement.expiresAt && endsLabel ? (
            <Badge variant="outline" className="text-xs font-semibold gap-1 bg-secondary/40 text-muted-foreground border-border">
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Visible hasta el {endsLabel}</span>
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
        {canEditExpiry && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (editingExpiry ? setEditingExpiry(false) : openExpiryEditor())}
            className="sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl"
            title={isPast ? 'Volver a publicar en Vigentes' : 'Cambiar vigencia'}
            aria-label={isPast ? 'Volver a publicar en Vigentes' : 'Cambiar vigencia'}
            aria-expanded={editingExpiry}
          >
            <CalendarClock className="w-4 h-4" />
          </Button>
        )}
        {canDelete && onDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(announcement.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
            title="Eliminar comunicado" aria-label="Eliminar comunicado"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
        </div>
      </div>

      {editingExpiry && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background p-3 text-xs">
          <label htmlFor={`expiry-${announcement.id}`} className="font-semibold text-foreground">
            {isPast ? 'Volver a mostrar hasta' : 'Visible hasta'}
          </label>
          <input
            id={`expiry-${announcement.id}`}
            type="date"
            min={today}
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="rounded-lg border border-border bg-background px-2.5 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button
            size="sm"
            className="h-8 rounded-lg text-xs font-bold"
            disabled={savingExpiry || !expiryDate || expiryDate < today}
            onClick={() => saveExpiry(endOfDayLima(expiryDate), isPast ? 'El comunicado volvió a Vigentes' : 'Vigencia actualizada')}
          >
            Guardar
          </Button>
          {!isPast && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-lg text-xs font-bold gap-1"
              disabled={savingExpiry}
              onClick={() => saveExpiry(new Date().toISOString(), 'Comunicado movido a Anteriores')}
            >
              <Archive className="w-3.5 h-3.5" /> Pasar a Anteriores
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-8 rounded-lg text-xs" onClick={() => setEditingExpiry(false)}>
            Cancelar
          </Button>
        </div>
      )}

      {/* Title */}
      <h3 className="text-base sm:text-lg font-black text-foreground mb-2 leading-snug tracking-tight">
        {announcement.title}
      </h3>

      {/* Content */}
      <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line mb-4 leading-relaxed">
        {announcement.content}
      </p>

      <AnnouncementResponsePanel announcement={announcement} />

      {/* Footer Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60 text-xs text-muted-foreground">
        {announcement.author && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0 border border-primary/20">
              {announcement.author.firstName[0]}
            </div>
            <span className="font-bold text-foreground">
              {announcement.author.firstName} {announcement.author.lastNamePaternal}
            </span>
            <span className="text-xs text-muted-foreground">
              • {announcement.author.role === 'TEACHER' ? 'Docente de Aula' : 'Dirección Escolar'}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 ml-auto text-xs text-muted-foreground font-medium">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <span>{formattedDate}</span>
        </div>
      </div>
    </div>
  );
};
