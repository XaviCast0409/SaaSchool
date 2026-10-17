import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Inbox,
  Loader2,
  Smartphone,
  BellRing,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  useGetNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useGetVapidPublicKey,
  useSavePushSubscription,
  useSendTestPushNotification,
} from '../api/useNotifications';
import { isPushSupported, subscribeUserToPush } from '../utils/push.util';
import { NotificationItem } from './NotificationItem';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [isPushSubscribing, setIsPushSubscribing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data, isLoading } = useGetNotifications({
    isRead: filterUnreadOnly ? false : undefined,
    limit: 20,
    page: 1,
  });

  const { data: vapidPublicKey } = useGetVapidPublicKey();
  const saveSubscription = useSavePushSubscription();
  const sendTestPush = useSendTestPushNotification();

  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const unreadCount = data?.meta?.unreadCount || 0;
  const notifications = data?.data || [];

  const pushSupported = isPushSupported();
  const isPushGranted =
    pushSupported &&
    typeof Notification !== 'undefined' &&
    Notification.permission === 'granted';

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (id: string, link?: string | null) => {
    markReadMutation.mutate(id);
    if (link) {
      setIsOpen(false);
      navigate(link);
    }
  };

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllReadMutation.mutate();
  };

  const handleEnablePush = async () => {
    if (!vapidPublicKey) {
      toast.error('No se pudo obtener la clave del servidor');
      return;
    }
    setIsPushSubscribing(true);
    try {
      const subscription = await subscribeUserToPush(vapidPublicKey);
      if (subscription) {
        await saveSubscription.mutateAsync(subscription);
        toast.success('¡Notificaciones en segundo plano activadas en tu celular!');
        await sendTestPush.mutateAsync().catch(() => {});
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'Error activando notificaciones push');
    } finally {
      setIsPushSubscribing(false);
    }
  };

  const handleTestPush = async () => {
    try {
      await sendTestPush.mutateAsync();
      toast.success('Notificación push enviada a tu dispositivo');
    } catch {
      toast.error('Error enviando notificación de prueba');
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Botón de la campanita */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-xl hover:bg-secondary/80 text-foreground"
        title="Notificaciones"
        aria-label="Abrir panel de notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black leading-none text-primary-foreground bg-primary rounded-full shadow-sm animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Panel Desplegable (Dropdown) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-card border border-border shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-border bg-secondary/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-foreground">Notificaciones</h3>
              {unreadCount > 0 && (
                <Badge
                  variant="default"
                  className="text-[10px] px-1.5 py-0 font-bold bg-primary text-primary-foreground"
                >
                  {unreadCount} nuevas
                </Badge>
              )}
            </div>

            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markAllReadMutation.isPending}
                className="h-7 text-xs px-2 text-primary hover:text-primary hover:bg-primary/10 gap-1 rounded-lg"
              >
                {markAllReadMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5" />
                )}
                <span>Marcar leídas</span>
              </Button>
            )}
          </div>

          {/* Banner de Push para celular dentro del dropdown */}
          {pushSupported && (
            <div className="px-3 py-2 bg-primary/5 border-b border-border/50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <Smartphone className="w-4 h-4 text-primary shrink-0" />
                <span className="text-[11px] font-medium text-muted-foreground truncate">
                  {isPushGranted ? 'Alertas en celular: Activas' : 'Alertas en celular'}
                </span>
              </div>
              {isPushGranted ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTestPush}
                  disabled={sendTestPush.isPending}
                  className="h-6 text-[10px] px-2 text-primary font-bold rounded-md"
                >
                  {sendTestPush.isPending ? 'Enviando...' : 'Probar'}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleEnablePush}
                  disabled={isPushSubscribing}
                  className="h-6 text-[10px] px-2 gap-1 rounded-md font-bold bg-primary text-primary-foreground"
                >
                  {isPushSubscribing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <BellRing className="w-3 h-3" />
                  )}
                  <span>Activar</span>
                </Button>
              )}
            </div>
          )}

          {/* Filtros rápidos: Todas / No leídas */}
          <div className="px-3 py-1.5 border-b border-border/60 bg-muted/20 flex items-center gap-2">
            <button
              onClick={() => setFilterUnreadOnly(false)}
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md transition-colors ${
                !filterUnreadOnly
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterUnreadOnly(true)}
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md transition-colors ${
                filterUnreadOnly
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              No leídas {unreadCount > 0 ? `(${unreadCount})` : ''}
            </button>
          </div>

          {/* Lista de Notificaciones */}
          <div className="max-h-[350px] overflow-y-auto divide-y divide-border/40">
            {isLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 px-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center mx-auto text-muted-foreground">
                  <Inbox className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-foreground">
                  {filterUnreadOnly
                    ? 'No tienes notificaciones sin leer'
                    : 'Sin notificaciones pendientes'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Aquí verás avisos de cobranzas, comunicados y alertas del colegio.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <NotificationItem
                  key={notif.id}
                  notification={notif}
                  onRead={handleNotificationClick}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-border bg-secondary/20 text-center">
            <span className="text-[10px] text-muted-foreground">
              Notificaciones en tiempo real y segundo plano • SaaSchool
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
