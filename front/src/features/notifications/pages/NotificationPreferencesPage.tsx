import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BellRing, Moon, Newspaper, Smartphone, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/useAuthStore';
import { apiErrorMessage } from '@/features/academic/api';
import {
  useGetVapidPublicKey,
  useNotificationPreferences,
  useSaveNotificationPreferences,
  useSavePushSubscription,
  useSendTestPushNotification,
  type NotificationKind,
  type NotificationPreferences,
} from '../api/useNotifications';
import { isPushSupported, subscribeUserToPush } from '../utils/push.util';
import { InstallAppGuide } from '../components/InstallAppGuide';

const KINDS: Array<{ value: NotificationKind; label: string; hint: string; roles?: string[] }> = [
  { value: 'PAYMENT', label: 'Pagos y pensiones', hint: 'Vencimientos y saldos pendientes', roles: ['PARENT', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'] },
  { value: 'ATTENDANCE', label: 'Asistencia', hint: 'Entradas, salidas y faltas' },
  { value: 'ACADEMIC', label: 'Notas y tareas', hint: 'Tareas por vencer, notas y cierres de periodo' },
  { value: 'ANNOUNCEMENT', label: 'Comunicados', hint: 'Avisos del colegio y del aula' },
  { value: 'MESSAGE', label: 'Mensajes', hint: 'Mensajes privados con familias o docentes', roles: ['PARENT', 'TEACHER', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'SUPER_ADMIN'] },
  { value: 'INCIDENT', label: 'Convivencia', hint: 'Incidencias y citaciones' },
  { value: 'GENERAL', label: 'Otros avisos', hint: 'Resúmenes, cumpleaños y novedades' },
];

const Check: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({ checked, onChange, label }) => (
  <input
    type="checkbox"
    checked={checked}
    onChange={(e) => onChange(e.target.checked)}
    aria-label={label}
    className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))] cursor-pointer"
  />
);

export const NotificationPreferencesPage: React.FC = () => {
  const { user } = useAuthStore();
  const isStudent = Boolean(user?.studentId);
  const role = isStudent ? 'STUDENT' : user?.role ?? 'PARENT';
  const { data, isLoading } = useNotificationPreferences();
  const save = useSaveNotificationPreferences();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);

  const { data: vapidPublicKey } = useGetVapidPublicKey();
  const savePushSubscription = useSavePushSubscription();
  const sendTestPush = useSendTestPushNotification();
  const [activatingPush, setActivatingPush] = useState(false);
  const pushPermission = typeof Notification !== 'undefined' ? Notification.permission : 'default';

  useEffect(() => {
    if (data) setPrefs(data);
  }, [data]);

  const kinds = KINDS.filter((k) => !k.roles || k.roles.includes(role));
  const showEmail = !isStudent;
  const showDigest = role === 'PARENT';

  const toggleIn = (list: NotificationKind[], kind: NotificationKind, enabled: boolean) =>
    enabled ? list.filter((k) => k !== kind) : [...new Set([...list, kind])];

  const handleSave = () => {
    if (!prefs) return;
    save.mutate(prefs, {
      onSuccess: () => toast.success('Preferencias guardadas'),
      onError: (e) => toast.error(apiErrorMessage(e)),
    });
  };

  const handleActivatePush = async () => {
    if (!vapidPublicKey) return toast.error('No se pudo obtener la clave de notificaciones');
    setActivatingPush(true);
    try {
      const sub = await subscribeUserToPush(vapidPublicKey);
      if (!sub) throw new Error('No se pudo activar en este dispositivo');
      await savePushSubscription.mutateAsync(sub);
      await sendTestPush.mutateAsync().catch(() => undefined);
      toast.success('Notificaciones activadas en este dispositivo');
    } catch (e) {
      toast.error(
        typeof Notification !== 'undefined' && Notification.permission === 'denied'
          ? 'Las notificaciones están bloqueadas en el navegador. Actívalas desde la configuración del sitio.'
          : (e as Error).message,
      );
    } finally {
      setActivatingPush(false);
    }
  };

  if (isLoading || !prefs) {
    return (
      <div className="max-w-3xl space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Mis notificaciones"
        description="Elige qué avisos quieres recibir y cuándo. Las notificaciones siempre quedan guardadas en la campanita de la app."
        actions={
          <Button onClick={handleSave} disabled={save.isPending} className="gap-2">
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Guardar cambios
          </Button>
        }
      />

      {/* Instalar la app (en iPhone es requisito para los avisos) */}
      {!isStudent && <InstallAppGuide />}

      {/* Push en este dispositivo */}
      {isPushSupported() && (
        <Card className="mb-4 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <Smartphone className="h-5 w-5 text-primary shrink-0" aria-hidden />
          <div className="flex-1 text-sm">
            <p className="font-medium text-foreground">Avisos en este celular o computadora</p>
            <p className="text-muted-foreground">
              {pushPermission === 'granted'
                ? 'Activados en este dispositivo.'
                : pushPermission === 'denied'
                  ? 'Bloqueados en el navegador. Actívalos desde la configuración del sitio.'
                  : 'Actívalos para recibir los avisos aunque no tengas la app abierta. En iPhone, primero agrega la app a la pantalla de inicio.'}
            </p>
          </div>
          {pushPermission !== 'granted' && pushPermission !== 'denied' && (
            <Button size="sm" variant="outline" onClick={handleActivatePush} disabled={activatingPush} className="gap-2">
              {activatingPush ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <BellRing className="h-4 w-4" aria-hidden />}
              Activar
            </Button>
          )}
        </Card>
      )}

      {/* Tipos de aviso por canal */}
      <Card className="mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-foreground text-sm">¿Qué avisos quieres recibir?</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="text-left font-medium px-4 py-2">Tipo de aviso</th>
              <th scope="col" className="font-medium px-3 py-2 w-24 text-center">Push</th>
              {showEmail && <th scope="col" className="font-medium px-3 py-2 w-24 text-center">Correo</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {kinds.map((k) => (
              <tr key={k.value}>
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{k.label}</p>
                  <p className="text-xs text-muted-foreground">{k.hint}</p>
                </td>
                <td className="px-3 py-3 text-center">
                  <Check
                    label={`Push: ${k.label}`}
                    checked={!prefs.mutedPush.includes(k.value)}
                    onChange={(v) => setPrefs({ ...prefs, mutedPush: toggleIn(prefs.mutedPush, k.value, v) })}
                  />
                </td>
                {showEmail && (
                  <td className="px-3 py-3 text-center">
                    <Check
                      label={`Correo: ${k.label}`}
                      checked={!prefs.mutedEmail.includes(k.value)}
                      onChange={(v) => setPrefs({ ...prefs, mutedEmail: toggleIn(prefs.mutedEmail, k.value, v) })}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {showDigest && (
        <Card className="mb-4 p-4 flex items-start gap-3">
          <Newspaper className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
          <label className="flex-1 text-sm cursor-pointer">
            <span className="font-medium text-foreground block">Resumen semanal de mis hijos</span>
            <span className="text-muted-foreground">
              Cada domingo por la tarde: asistencia, tareas de la semana, comunicados y pagos.
            </span>
          </label>
          <Check
            label="Resumen semanal"
            checked={prefs.weeklyDigest}
            onChange={(v) => setPrefs({ ...prefs, weeklyDigest: v })}
          />
        </Card>
      )}

      <Card className="p-4">
        <div className="flex items-start gap-3">
          <Moon className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
          <div className="flex-1 text-sm">
            <p className="font-medium text-foreground">Horario de silencio</p>
            <p className="text-muted-foreground">
              En este horario no sonarán avisos push. Igual los verás en la campanita al entrar a la app.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="text-xs text-muted-foreground" htmlFor="quiet-from">Desde</label>
              <Input
                id="quiet-from"
                type="time"
                className="w-32 h-9"
                value={prefs.quietFrom ?? ''}
                onChange={(e) => setPrefs({ ...prefs, quietFrom: e.target.value || null })}
              />
              <label className="text-xs text-muted-foreground" htmlFor="quiet-to">hasta</label>
              <Input
                id="quiet-to"
                type="time"
                className="w-32 h-9"
                value={prefs.quietTo ?? ''}
                onChange={(e) => setPrefs({ ...prefs, quietTo: e.target.value || null })}
              />
              {(prefs.quietFrom || prefs.quietTo) && (
                <Button size="sm" variant="ghost" onClick={() => setPrefs({ ...prefs, quietFrom: null, quietTo: null })}>
                  Quitar
                </Button>
              )}
              {!prefs.quietFrom && !prefs.quietTo && (
                <Button size="sm" variant="outline" onClick={() => setPrefs({ ...prefs, quietFrom: '21:00', quietTo: '07:00' })}>
                  Usar 9:00 p. m. a 7:00 a. m.
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
