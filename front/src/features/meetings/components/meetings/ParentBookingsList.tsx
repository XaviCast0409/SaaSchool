import React from 'react';
import { Clock, MapPin, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { confirmDialog } from '@/components/ui/confirm';
import { getApiErrorMessage } from '@/lib/errors';
import { useCancelBooking, type MeetingSlot } from '../../api/useMeetings';
import { CANCEL_NOTICE_MS, panel, dayLabel, range } from './constants';
import { EmptyBlock, DateChip, ModeBadge } from './MeetingsUI';

interface ParentBookingsListProps {
  bookings: MeetingSlot[] | undefined;
}

export const ParentBookingsList: React.FC<ParentBookingsListProps> = ({ bookings }) => {
  const cancel = useCancelBooking();
  const bookingCount = bookings?.length ?? 0;

  return (
    <section className={panel}>
      {bookingCount === 0 ? (
        <EmptyBlock icon={<Clock />} title="No tienes entrevistas reservadas">
          Elige un horario libre en la pestaña Reservar.
        </EmptyBlock>
      ) : (
        <ul className="divide-y divide-border/60">
          {bookings!.map((b) => (
            <li
              key={b.id}
              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/20 sm:px-5"
            >
              <DateChip iso={b.startsAt} />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-bold text-foreground">{dayLabel(b.startsAt)}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                    <Clock className="h-3 w-3 text-muted-foreground" aria-hidden /> {range(b)}
                  </span>
                  <ModeBadge mode={b.mode} />
                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Confirmada
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{b.staffName}</span>
                  {b.student ? ` · ${b.student.name}` : ''}
                </p>
                {b.location && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                    <span className="truncate">{b.location}</span>
                  </p>
                )}
              </div>
              {new Date(b.startsAt).getTime() - Date.now() >= CANCEL_NOTICE_MS ? (
                <Button
                  size="sm"
                  variant="outline"
                  aria-label="Cancelar entrevista"
                  className="h-10 shrink-0 gap-1 rounded-lg border-destructive/30 px-3 text-xs font-bold sm:h-8 sm:px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={async () =>
                    (await confirmDialog({
                      title: '¿Cancelar esta entrevista?',
                      description: `${b.staffName} recibirá un aviso y el horario quedará libre para otra familia.`,
                      confirmText: 'Cancelar entrevista',
                      cancelText: 'Volver',
                      variant: 'danger',
                    })) &&
                    cancel.mutate(b.id, {
                      onSuccess: () => toast.success('Entrevista cancelada. Avisamos al docente.'),
                      onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo cancelar la reserva.')),
                    })
                  }
                >
                  <XCircle className="h-3.5 w-3.5" aria-hidden />
                  <span>Cancelar</span>
                </Button>
              ) : (
                <p className="max-w-[9rem] shrink-0 text-right text-xs text-muted-foreground">
                  ¿Un imprevisto? Escríbele por Mensajes.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
