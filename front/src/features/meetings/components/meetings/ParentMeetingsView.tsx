import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  GraduationCap,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPeruDate, formatPeruTime } from '@/lib/dateUtils';
import { getApiErrorMessage } from '@/lib/errors';
import { useParentStore } from '@/store/useParentStore';
import { useGetMyChildren } from '@/features/students/api/useStudents';
import { ChildSwitcher } from '@/features/parent/components/ChildSwitcher';
import { useOpenConversation } from '@/features/messages/api/useMessages';
import {
  MODE_LABEL,
  useAvailableSlots,
  useBookSlot,
  useRequestMeeting,
  useMyBookings,
} from '../../api/useMeetings';
import { panel, range, groupByDay } from './constants';
import { UnderlineTabs, EmptyBlock, ModeIcon, PanelHeader } from './MeetingsUI';
import { BookMeetingModal } from './BookMeetingModal';
import { RequestMeetingModal } from './RequestMeetingModal';
import { ParentBookingsList } from './ParentBookingsList';

type ParentTab = 'BOOK' | 'MINE';

export const ParentMeetingsView: React.FC = () => {
  const { data: children = [], isLoading: loadingChildren } = useGetMyChildren();
  const { selectedChildId, setSelectedChildId } = useParentStore();
  const childId = useMemo(
    () => (children.some((c) => c.id === selectedChildId) ? selectedChildId : (children[0]?.id ?? null)),
    [children, selectedChildId],
  );
  useEffect(() => {
    if (childId && childId !== selectedChildId) setSelectedChildId(childId);
  }, [childId, selectedChildId, setSelectedChildId]);

  const { data: available, isLoading } = useAvailableSlots(childId);
  const { data: bookings } = useMyBookings(true);
  const book = useBookSlot();
  const [tab, setTab] = useState<ParentTab>('BOOK');
  const [picked, setPicked] = useState<{ id: string; label: string } | null>(null);
  const [reason, setReason] = useState('');
  // Docentes con horarios libres (se reservan) y sin horarios (se les pide uno)
  const withSlots = (available ?? []).filter((s) => s.slots.length > 0);
  const withoutSlots = (available ?? []).filter((s) => s.slots.length === 0);
  const requestMeeting = useRequestMeeting();
  const [requesting, setRequesting] = useState<{ id: string; name: string } | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const openChat = useOpenConversation();
  const navigate = useNavigate();

  const writeTo = (staffId: string) => {
    if (!childId) return;
    openChat.mutate(
      { studentId: childId, counterpartId: staffId },
      {
        onSuccess: (c) => navigate(`/messages?c=${c.id}`),
        onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo abrir la conversación.')),
      },
    );
  };

  const confirmRequest = () => {
    if (!requesting || !childId) return;
    requestMeeting.mutate(
      { studentId: childId, staffId: requesting.id, message: requestMessage.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`Listo: le avisamos a ${requesting.name}. Te contaremos cuando publique horarios.`);
          setRequesting(null);
        },
        onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo enviar la solicitud.')),
      },
    );
  };

  const confirmBooking = () => {
    if (!picked || !childId) return;
    book.mutate(
      { id: picked.id, studentId: childId, reason },
      {
        onSuccess: () => {
          toast.success('Entrevista reservada. Te recordaremos un día antes.');
          setPicked(null);
          setReason('');
        },
        onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo reservar el horario.')),
      },
    );
  };

  if (loadingChildren) return <Skeleton className="h-40 w-full rounded-2xl" />;

  const bookingCount = bookings?.length ?? 0;

  return (
    <div className="space-y-6">
      <ChildSwitcher childrenList={children} selectedId={childId ?? ''} onSelect={setSelectedChildId} />

      <div className="space-y-3">
        <UnderlineTabs<ParentTab>
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'BOOK', label: 'Reservar' },
            { key: 'MINE', label: 'Mis entrevistas', count: bookingCount },
          ]}
        />

        {tab === 'MINE' ? (
          <ParentBookingsList bookings={bookings} />
        ) : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ) : !available || available.length === 0 ? (
          <section className={panel}>
            <EmptyBlock icon={<CalendarClock />} title="Aún no hay docentes asignados">
              Cuando el colegio asigne los cursos de tu hijo(a), aquí verás a sus docentes para pedirles una entrevista.
            </EmptyBlock>
          </section>
        ) : (
          <div className="space-y-4">
            {withSlots.length === 0 && (
              <p className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                Por ahora ningún docente de tu hijo(a) tiene horarios libres. Pídele uno y te avisaremos en cuanto lo
                publique.
              </p>
            )}
            {withSlots.map((staff) => (
              <section key={staff.id} className={panel}>
                <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">
                    {staff.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h2 className="truncate text-sm font-black tracking-tight text-foreground">{staff.name}</h2>
                      {staff.isTutor && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                          <GraduationCap className="h-3 w-3" aria-hidden /> Tutor(a)
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {staff.roleLabel}
                      {staff.subjects.length ? ` · ${staff.subjects.join(', ')}` : ''}
                    </p>
                  </div>
                </div>
                <div className="space-y-4 p-4 sm:p-5">
                  {groupByDay(staff.slots).map(([day, slots]) => (
                    <div key={day} className="space-y-2">
                      <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden /> {day}
                      </p>
                      <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 sm:flex sm:flex-wrap">
                        {slots.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            title={MODE_LABEL[s.mode]}
                            onClick={() =>
                              setPicked({
                                id: s.id,
                                label: `${staff.name} · ${day} · ${range(s)} · ${MODE_LABEL[s.mode]}`,
                              })
                            }
                            className="flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-background px-3 py-2 text-sm font-bold sm:min-h-0 sm:text-xs text-foreground shadow-sm transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <ModeIcon mode={s.mode} className="h-3.5 w-3.5 text-muted-foreground" />{' '}
                            {formatPeruTime(s.startsAt)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* Docentes que aún no publican horarios: se les pide uno o se les escribe */}
            {withoutSlots.length > 0 && (
              <section className={panel}>
                <PanelHeader
                  icon={<CalendarPlus className="h-4 w-4" />}
                  title="Docentes sin horarios publicados"
                  description="Pídeles un horario: te avisaremos cuando lo publiquen."
                />
                <ul className="divide-y divide-border/60">
                  {withoutSlots.map((staff) => {
                    const requested = Boolean(staff.requestedAt);
                    return (
                      <li key={staff.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-sm font-black text-muted-foreground">
                            {staff.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-sm font-bold text-foreground">{staff.name}</p>
                              {staff.isTutor && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                                  <GraduationCap className="h-3 w-3" aria-hidden /> Tutor(a)
                                </span>
                              )}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {staff.subjects.length ? staff.subjects.join(', ') : staff.roleLabel}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-10 gap-1.5 rounded-xl text-xs font-bold sm:h-8"
                            disabled={openChat.isPending}
                            onClick={() => writeTo(staff.id)}
                          >
                            <MessageSquare className="h-3.5 w-3.5" aria-hidden /> Escribir
                          </Button>
                          {requested ? (
                            <span
                              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 text-xs font-bold text-emerald-700 dark:text-emerald-300 sm:h-8"
                              title="Te avisaremos cuando publique horarios"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Pedido el{' '}
                              {formatPeruDate(staff.requestedAt!, { day: 'numeric', month: 'short' })}
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              className="h-10 gap-1.5 rounded-xl text-xs font-bold sm:h-8"
                              onClick={() => {
                                setRequestMessage('');
                                setRequesting({ id: staff.id, name: staff.name });
                              }}
                            >
                              <CalendarPlus className="h-3.5 w-3.5" aria-hidden /> Pedir horario
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>

      <BookMeetingModal
        picked={picked}
        onClose={() => setPicked(null)}
        reason={reason}
        onReasonChange={setReason}
        onConfirm={confirmBooking}
        isPending={book.isPending}
      />

      <RequestMeetingModal
        requesting={requesting}
        onClose={() => setRequesting(null)}
        requestMessage={requestMessage}
        onRequestMessageChange={setRequestMessage}
        onConfirm={confirmRequest}
        isPending={requestMeeting.isPending}
      />
    </div>
  );
};
