import React, { useState, useEffect } from 'react';
import { Smartphone, BellRing, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { isMobileDevice, isPushSupported, subscribeUserToPush } from '../utils/push.util';
import {
  useGetVapidPublicKey,
  useSavePushSubscription,
  useSendTestPushNotification,
} from '../api/useNotifications';

const SNOOZE_KEY = 'saaschool_push_prompt_snoozed_until';

export const MobilePushBanner: React.FC = () => {
  const [shouldShow, setShouldShow] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const { data: vapidPublicKey } = useGetVapidPublicKey();
  const saveSubscription = useSavePushSubscription();
  const sendTestPush = useSendTestPushNotification();

  useEffect(() => {
    // Solo evaluar en celulares y navegadores compatibles
    if (!isMobileDevice() || !isPushSupported()) {
      return;
    }

    // Si ya tiene permiso otorgado o bloqueado
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      return;
    }

    // Comprobar si el usuario pospuso la solicitud
    const snoozedUntil = localStorage.getItem(SNOOZE_KEY);
    if (snoozedUntil && new Date().getTime() < Number(snoozedUntil)) {
      return;
    }

    setShouldShow(true);
  }, []);

  const handleDismiss = () => {
    // Posponer por 3 días
    const snoozeTime = new Date().getTime() + 3 * 24 * 60 * 60 * 1000;
    localStorage.setItem(SNOOZE_KEY, String(snoozeTime));
    setShouldShow(false);
  };

  const handleActivatePush = async () => {
    if (!vapidPublicKey) {
      toast.error('No se pudo obtener la clave del servidor de notificaciones');
      return;
    }

    setIsSubscribing(true);
    try {
      const subscription = await subscribeUserToPush(vapidPublicKey);
      if (!subscription) {
        throw new Error('No se pudo generar la suscripción');
      }

      await saveSubscription.mutateAsync(subscription);
      toast.success('¡Notificaciones en segundo plano activadas en tu celular!');
      setShouldShow(false);

      // Enviar notificación de bienvenida en segundo plano
      await sendTestPush.mutateAsync().catch(() => {});
    } catch (err: unknown) {
      const error = err as Error;
      if (Notification.permission === 'denied') {
        toast.error('Has denegado los permisos de notificación en tu celular');
        setShouldShow(false);
      } else {
        toast.error(error.message || 'Error activando notificaciones');
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  if (!shouldShow) return null;

  return (
    <div className="mx-3 my-2 p-3.5 rounded-2xl bg-card border border-primary/30 shadow-md animate-in slide-in-from-top-3 duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-foreground">
                Notificaciones en tu celular
              </h4>
              <Badge
                variant="default"
                className="text-[9px] px-1.5 py-0 font-bold bg-primary text-primary-foreground"
              >
                2do Plano
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              Activa las alertas para recibir avisos de pagos, comunicados y notas aunque tengas la app cerrada.
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground p-1 rounded-md"
          aria-label="Cerrar aviso"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-border/40">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="text-xs h-7 text-muted-foreground"
        >
          Ahora no
        </Button>
        <Button
          size="sm"
          onClick={handleActivatePush}
          disabled={isSubscribing}
          className="text-xs h-7 gap-1.5 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isSubscribing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <BellRing className="w-3 h-3" />
          )}
          <span>Activar en Celular</span>
        </Button>
      </div>
    </div>
  );
};
