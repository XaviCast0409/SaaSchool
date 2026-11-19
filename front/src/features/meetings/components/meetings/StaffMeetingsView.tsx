import React, { useState } from 'react';
import {
  CalendarDays,
  CalendarCheck2,
  CalendarClock,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { confirmDialog } from '@/components/ui/confirm';
import { getApiErrorMessage } from '@/lib/errors';
import { useAuthStore } from '@/store/useAuthStore';
import { useMySlots, useCancelSlot, type MeetingSlot } from '../../api/useMeetings';
import { panel, range, groupByDay } from './constants';
import { StatTile, UnderlineTabs, EmptyBlock, ModeIcon, ModeBadge } from './MeetingsUI';
import { PublishSlotsCard } from './PublishSlotsCard';
import { RequestsPanel } from './RequestsPanel';

type SlotFilter = 'ALL' | 'BOOKED' | 'AVAILABLE' | 'PAST';

export const StaffMeetingsView: React.FC = () => {
  const isDirection = useAuthStore((s) => s.user?.role === 'SCHOOL_ADMIN' || s.user?.role === 'SUPER_ADMIN');
  const { data, isLoading } = useMySlots(true);
  const cancel = useCancelSlot();
  const [filter, setFilter] = useState<SlotFilter>('ALL');
  // Entrevista reservada que se va a cancelar: se pide un motivo para la familia
  const [cancelling, setCancelling] = useState<MeetingSlot | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const now = Date.now();
  const upcoming = (data ?? []).filter((s) => new Date(s.endsAt).getTime() >= now);
  // Historial: entrevistas reservadas de los últimos 7 días, la más reciente primero
  const past = (data ?? []).filter((s) => new Date(s.endsAt).getTime() < now && s.status === 'BOOKED').reverse();
  const booked = upcoming.filter((s) => s.status === 'BOOKED').length;
  const free = upcoming.length - booked;
  const visible =
    filter === 'PAST'
      ? past
      : filter === 'ALL'
        ? upcoming
        : upcoming.filter((s) => (filter === 'BOOKED' ? s.status === 'BOOKED' : s.status !== 'BOOKED'));

  const onCancel = async (s: MeetingSlot) => {
    if (s.status === 'BOOKED') {
      setCancelReason('');
      setCancelling(s);
      return;
    }
    if (
      !(await confirmDialog({
        title: '¿Quitar este horario libre?',
        confirmText: 'Quitar horario',
        cancelText: 'Volver',
        variant: 'danger',
      }))
    )
      return;
    cancel.mutate(
      { id: s.id },
      { onSuccess: () => toast.success('Horario quitado.'), onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo quitar el horario.')) },
    );
  };

  const confirmCancelBooked = () => {
    if (!cancelling) return;
    cancel.mutate(
      { id: cancelling.id, reason: cancelReason.trim() || undefined },
      {
        onSuccess: () => {
          toast.success('Entrevista cancelada. Avisamos a la familia.');
          setCancelling(null);
        },
        onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo cancelar la entrevista.')),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatTile
          label="Próximos"
          value={upcoming.length}
          icon={<CalendarDays className="h-4 w-4" />}
          tone="bg-primary/10 text-primary"
        />
        <StatTile
          label="Reservados"
          value={booked}
          icon={<CalendarCheck2 className="h-4 w-4" />}
          tone="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
        />
        <StatTile
          label="Libres"
          value={free}
          icon={<Clock className="h-4 w-4" />}
          tone="bg-amber-500/15 text-amber-600 dark:text-amber-400"
        />
      </div>

      {isDirection && (
        <p className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Las familias reservan entrevistas solo con los docentes que enseñan a sus hijos. Si dictas cursos o eres
          tutor(a) de un aula, publica aquí tus horarios.
        </p>
      )}

      <RequestsPanel />

      <PublishSlotsCard />

      <div className="space-y-3">
        <UnderlineTabs<SlotFilter>
          value={filter}
          onChange={setFilter}
          tabs={[
            { key: 'ALL', label: 'Todos', count: upcoming.length },
            { key: 'BOOKED', label: 'Reservados', count: booked },
            { key: 'AVAILABLE', label: 'Libres', count: free },
            { key: 'PAST', label: 'Pasadas', count: past.length },
          ]}
        />

        <section className={panel}>
          {isLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          ) : visible.length === 0 ? (
            <EmptyBlock
              icon={<CalendarClock />}
              title={
                filter === 'PAST'
                  ? 'Sin entrevistas en los últimos 7 días'
                  : upcoming.length === 0
                    ? 'Aún no publicas horarios'
                    : 'No hay horarios en esta sección'
              }
            >
              {filter === 'PAST'
                ? 'Aquí verás las entrevistas que ya ocurrieron.'
                : upcoming.length === 0
                  ? 'Las familias de tus alumnos podrán reservarlos desde su app.'
                  : 'Prueba con otra pestaña.'}
            </EmptyBlock>
          ) : (
            <div className="divide-y divide-border/60">
              {groupByDay(visible).map(([day, slots]) => (
                <div key={day}>
                  <p className="flex items-center gap-2 bg-muted/40 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-muted-foreground sm:px-5">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden /> {day}
                  </p>
                  <ul className="divide-y divide-border/60">
                    {slots.map((s) => {
                      const isBooked = s.status === 'BOOKED';
                      return (
                        <li
                          key={s.id}
                          className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/20 sm:px-5"
                        >
                          <div
                            className={cn(
                              'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                              isBooked
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            <ModeIcon mode={s.mode} className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="whitespace-nowrap text-sm font-bold text-foreground">{range(s)}</span>
                              <span
                                className={cn(
                                  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold',
                                  isBooked
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                                )}
                              >
                                {isBooked ? 'Reservado' : 'Libre'}
                              </span>
                              <ModeBadge mode={s.mode} />
                            </div>
                            {isBooked && s.parent && (
                              <p className="text-xs text-foreground">
                                <span className="font-semibold">
                                  {s.parent.firstName} {s.parent.lastNamePaternal}
                                </span>
                                <span className="text-muted-foreground">
                                  {s.student ? ` · ${s.student.name}` : ''}
                                  {s.parent.cellphone ? ` · ${s.parent.cellphone}` : ''}
                                </span>
                              </p>
                            )}
                            {isBooked && s.reason && (
                              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                                <span className="line-clamp-2">“{s.reason}”</span>
                              </p>
                            )}
                            {s.location && (
                              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                                <span className="truncate">{s.location}</span>
                              </p>
                            )}
                          </div>
                          {filter !== 'PAST' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onCancel(s)}
                              disabled={cancel.isPending}
                              aria-label={isBooked ? 'Cancelar entrevista' : 'Quitar horario'}
                              className="h-10 w-10 shrink-0 justify-center gap-1 rounded-lg border-destructive/30 px-0 text-xs font-bold sm:h-8 sm:w-auto sm:px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              {isBooked ? <XCircle className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                              <span className="hidden sm:inline">{isBooked ? 'Cancelar' : 'Quitar'}</span>
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal
        open={Boolean(cancelling)}
        onClose={() => setCancelling(null)}
        title="¿Cancelar esta entrevista?"
        description={
          cancelling
            ? `${cancelling.parent ? `${cancelling.parent.firstName} ${cancelling.parent.lastNamePaternal}` : 'La familia'} recibirá un aviso y podrá reservar otro horario.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelling(null)}>
              Volver
            </Button>
            <Button variant="destructive" onClick={confirmCancelBooked} disabled={cancel.isPending}>
              {cancel.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Cancelar entrevista
            </Button>
          </>
        }
      >
        <label className="block space-y-1.5 text-xs font-semibold text-muted-foreground">
          <span>Motivo para la familia (opcional)</span>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value.slice(0, 300))}
            placeholder="Ej. Tengo una reunión de coordinación a esa hora."
            rows={3}
          />
        </label>
      </Modal>
    </div>
  );
};
