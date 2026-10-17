import React from 'react';
import {
  CreditCard,
  Megaphone,
  CalendarCheck,
  BookOpenCheck,
  Bell,
  Clock,
  Check,
} from 'lucide-react';
import type { AppNotification, NotificationType } from '../types';

interface NotificationItemProps {
  notification: AppNotification;
  onRead: (id: string, link?: string | null) => void;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'PAYMENT':
      return <CreditCard className="w-4 h-4 text-primary" />;
    case 'ANNOUNCEMENT':
      return <Megaphone className="w-4 h-4 text-primary" />;
    case 'ATTENDANCE':
      return <CalendarCheck className="w-4 h-4 text-primary" />;
    case 'ACADEMIC':
      return <BookOpenCheck className="w-4 h-4 text-primary" />;
    default:
      return <Bell className="w-4 h-4 text-primary" />;
  }
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Hace un momento';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `Hace ${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Hace ${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `Hace ${diffInDays}d`;

  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
};

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onRead,
}) => {
  return (
    <div
      onClick={() => onRead(notification.id, notification.link)}
      className={`group relative flex items-start gap-3 p-3 text-left transition-colors cursor-pointer border-b border-border/50 last:border-b-0 ${
        !notification.isRead
          ? 'bg-primary/5 hover:bg-primary/10'
          : 'hover:bg-secondary/50 opacity-80 hover:opacity-100'
      }`}
    >
      {/* Icon Pill */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
          !notification.isRead
            ? 'bg-primary/10 border-primary/20'
            : 'bg-muted border-border/60 text-muted-foreground'
        }`}
      >
        {getNotificationIcon(notification.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <h4
            className={`text-xs truncate ${
              !notification.isRead
                ? 'font-bold text-foreground'
                : 'font-medium text-muted-foreground'
            }`}
          >
            {notification.title}
          </h4>
          <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {formatTimeAgo(notification.createdAt)}
          </span>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {notification.message}
        </p>

        {notification.link && (
          <span className="inline-block mt-1 text-[10px] font-semibold text-primary underline underline-offset-2">
            Ver detalles →
          </span>
        )}
      </div>

      {/* Unread Indicator */}
      {!notification.isRead ? (
        <span
          className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5 shadow-sm"
          title="No leída"
        />
      ) : (
        <Check className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-1" />
      )}
    </div>
  );
};
