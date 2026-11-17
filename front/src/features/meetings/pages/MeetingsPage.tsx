import { confirmDialog } from '@/components/ui/confirm';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  Trash2,
  Video,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import { formatPeruDate, formatPeruTime, getPeruToday } from '@/lib/dateUtils';
import { useAuthStore } from '@/store/useAuthStore';
import { useParentStore } from '@/store/useParentStore';
import { useGetMyChildren } from '@/features/students/api/useStudents';
import { ChildSwitcher } from '@/features/parent/components/ChildSwitcher';
import { apiErrorMessage } from '@/features/academic/api';
import { useNavigate } from 'react-router-dom';
import { useOpenConversation } from '@/features/messages/api/useMessages';
import {
  MODE_LABEL,
  useAvailableSlots,
  useBookSlot,
  useDismissMeetingRequest,
  useMeetingRequests,
  useRequestMeeting,
  useCancelBooking,
  useCancelSlot,
  useCreateSlots,
  useMyBookings,
  useMySlots,
  type MeetingMode,
  type MeetingSlot,
} from '../api/useMeetings';

const ModeIcon: React.FC<{ mode: MeetingMode; className?: string }> = ({ mode, className }) =>
  mode === 'VIRTUAL' ? <Video className={className} aria-hidden /> : mode === 'PHONE' ? <Phone className={className} aria-hidden /> : <MapPin className={className} aria-hidden />;

const upperFirst = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const dayLabel = (iso: string) => upperFirst(formatPeruDate(iso, { weekday: 'long', day: 'numeric', month: 'long' }));
const range = (s: { startsAt: string; endsAt: string }) => `${formatPeruTime(s.startsAt)} – ${formatPeruTime(s.endsAt)}`;

function groupByDay<T extends { startsAt: string }>(items: T[]) {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const k = dayLabel(it.startsAt);
    map.set(k, [...(map.get(k) ?? []), it]);
  }
  return [...map.entries()];
}

// ---------------------------------------------------------------- Piezas visuales

const panel = 'rounded-2xl bg-card border border-border shadow-sm overflow-hidden';

const PanelHeader: React.FC<{ icon: React.ReactNode; title: string; description?: string; right?: React.ReactNode }> = ({ icon, title, description, right }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <div className="min-w-0">
        <h2 className="text-sm font-black tracking-tight text-foreground">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
    {right}
  </div>
);

interface UnderlineTab<T extends string> {
  key: T;
  label: string;
  count?: number;
}

function UnderlineTabs<T extends string>({ tabs, value, onChange }: { tabs: UnderlineTab<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex items-center gap-1 border-b border-border" role="tablist">
      {tabs.map((tab) => {
        const isActive = value === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={cn(
              '-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors',
              isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-xs font-bold leading-none',
                  isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

const EmptyBlock: React.FC<{ icon: React.ReactNode; title: string; children?: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="space-y-2 p-10 text-center text-muted-foreground">
    <div className="mx-auto flex w-fit opacity-30 [&>svg]:h-10 [&>svg]:w-10">{icon}</div>
    <p className="text-sm font-bold text-foreground">{title}</p>
    {children && <p className="mx-auto max-w-md text-xs text-muted-foreground">{children}</p>}
  </div>
);

const ModeBadge: React.FC<{ mode: MeetingMode }> = ({ mode }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">
    <ModeIcon mode={mode} className="h-3 w-3" /> {MODE_LABEL[mode]}
  </span>
);

const StatTile: React.FC<{ label: string; value: number; icon: React.ReactNode; tone: string }> = ({ label, value, icon, tone }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
    <div className={cn('hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:flex', tone)}>{icon}</div>
    <div className="min-w-0">
      <p className="text-xl font-black leading-none text-foreground">{value}</p>
      <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">{label}</p>
    </div>
  </div>
);

/** Bloque con día y mes, para listas cronológicas. */
const DateChip: React.FC<{ iso: string }> = ({ iso }) => (
  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
    <span className="text-lg font-black leading-none">{formatPeruDate(iso, { day: 'numeric' })}</span>
    <span className="mt-0.5 text-xs font-bold uppercase tracking-wider">{formatPeruDate(iso, { month: 'short' }).replace('.', '')}</span>
  </div>
);

const fieldLabel = 'block min-w-0 space-y-1 [&>span]:block [&>span]:truncate text-xs font-bold uppercase tracking-wider text-muted-foreground';
const fieldControl = 'h-10 rounded-xl text-sm normal-case tracking-normal font-normal';
const selectControl =
  'h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

// ---------------------------------------------------------------- Personal

const PublishSlotsCard: React.FC = () => {
  const create = useCreateSlots();
  const [form, setForm] = useState({ date: getPeruToday(), from: '14:00', to: '16:00', durationMinutes: 20, mode: 'IN_PERSON' as MeetingMode, location: '', repeatWeeks: 1 });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      { ...form, location: form.location || undefined },
      {
        onSuccess: (r) => {
          const weeks = form.repeatWeeks > 1 ? ` en ${form.repeatWeeks} semanas` : '';
          const base = r.skipped ? `${r.created} horario(s) publicados${weeks}; ${r.skipped} se omitieron por cruce.` : `${r.created} horario(s) publicados${weeks}.`;
          // Familias que habían pedido horario: ya recibieron el aviso
          toast.success(r.notified ? `${base} Avisamos a ${r.notified} familia(s) que te pidieron entrevista.` : base);
        },
        onError: (err) => toast.error(apiErrorMessage(err)),
      },
    );
  };
  return (
    <section className={panel}>
      <PanelHeader
        icon={<CalendarPlus className="h-4 w-4" />}
        title="Publicar horarios de atención"
        description="Se crean bloques del tamaño elegido entre las horas indicadas."
      />
      <form onSubmit={submit} className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5 xl:grid-cols-6">
        <label className={cn(fieldLabel, 'col-span-2 sm:col-span-1')}>
          <span>Día</span>
          <Input type="date" className={fieldControl} min={getPeruToday()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        </label>
        <label className={fieldLabel}>
          <span>Desde</span>
          <Input type="time" className={fieldControl} value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} required />
        </label>
        <label className={fieldLabel}>
          <span>Hasta</span>
          <Input type="time" className={fieldControl} value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} required />
        </label>
        <label className={fieldLabel}>
          <span>Cada</span>
          <select className={selectControl} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}>
            {[15, 20, 30, 45, 60].map((m) => (
              <option key={m} value={m}>{m} min</option>
            ))}
          </select>
        </label>
        <label className={fieldLabel}>
          <span>Modalidad</span>
          <select className={selectControl} value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as MeetingMode })}>
            {(Object.keys(MODE_LABEL) as MeetingMode[]).map((m) => (
              <option key={m} value={m}>{MODE_LABEL[m]}</option>
            ))}
          </select>
        </label>
        <label className={fieldLabel}>
          <span>Repetir</span>
          <select className={selectControl} value={form.repeatWeeks} onChange={(e) => setForm({ ...form, repeatWeeks: Number(e.target.value) })}>
            <option value={1}>Solo ese día</option>
            {[2, 4, 6, 8].map((w) => (
              <option key={w} value={w}>{w} semanas</option>
            ))}
          </select>
        </label>
        <label className={cn(fieldLabel, 'col-span-2 sm:col-span-3 xl:col-span-6')}>
          <span>Lugar o enlace</span>
          <Input className={fieldControl} placeholder="Aula 3B / enlace Meet" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={200} />
        </label>
        <div className="col-span-2 flex justify-end border-t border-border pt-3 sm:col-span-3 lg:col-span-6">
          <Button type="submit" disabled={create.isPending} className="w-full gap-2 rounded-xl text-xs font-bold sm:w-auto">
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CalendarPlus className="h-4 w-4" aria-hidden />} Publicar horarios
          </Button>
        </div>
      </form>
    </section>
  );
};

/** Anticipación mínima para que la familia cancele (igual que para reservar) */
const CANCEL_NOTICE_MS = 2 * 3_600_000;

type SlotFilter = 'ALL' | 'BOOKED' | 'AVAILABLE' | 'PAST';

/** Familias que le pidieron horario al docente: al publicar horarios se les avisa solo. */
const RequestsPanel: React.FC = () => {
  const { data: requests = [] } = useMeetingRequests(true);
  const dismiss = useDismissMeetingRequest();
  if (requests.length === 0) return null;
  return (
    <section className={cn(panel, 'border-amber-500/40')}>
      <PanelHeader
        icon={<MessageSquare className="h-4 w-4" />}
        title={`${requests.length} familia${requests.length === 1 ? '' : 's'} te ${requests.length === 1 ? 'pidió' : 'pidieron'} una entrevista`}
        description="Publica tus horarios abajo y les avisaremos para que reserven."
      />
      <ul className="divide-y divide-border/60">
        {requests.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:px-5">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-bold text-foreground">
                {r.parent.firstName} {r.parent.lastNamePaternal}
                <span className="font-normal text-muted-foreground"> · {r.student.name}</span>
              </p>
              {r.message && <p className="text-sm text-muted-foreground">«{r.message}»</p>}
              <p className="text-xs text-muted-foreground">
                Pedido el {formatPeruDate(r.createdAt, { day: 'numeric', month: 'long' })}
                {r.parent.cellphone ? ` · Cel. ${r.parent.cellphone}` : ''}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-9 shrink-0 self-start rounded-xl text-xs font-bold text-muted-foreground"
              disabled={dismiss.isPending}
              onClick={() =>
                dismiss.mutate(r.id, {
                  onSuccess: () => toast.success('Solicitud marcada como atendida.'),
                  onError: (e) => toast.error(apiErrorMessage(e)),
                })
              }
              title="Ya conversaste con la familia por otro medio"
            >
              Ya lo atendí
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
};

const StaffView: React.FC = () => {
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
    if (!(await confirmDialog({ title: '¿Quitar este horario libre?', confirmText: 'Quitar horario', cancelText: 'Volver', variant: 'danger' }))) return;
    cancel.mutate({ id: s.id }, { onSuccess: () => toast.success('Horario quitado.'), onError: (e) => toast.error(apiErrorMessage(e)) });
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
        onError: (e) => toast.error(apiErrorMessage(e)),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatTile label="Próximos" value={upcoming.length} icon={<CalendarDays className="h-4 w-4" />} tone="bg-primary/10 text-primary" />
        <StatTile label="Reservados" value={booked} icon={<CalendarCheck2 className="h-4 w-4" />} tone="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" />
        <StatTile label="Libres" value={free} icon={<Clock className="h-4 w-4" />} tone="bg-amber-500/15 text-amber-600 dark:text-amber-400" />
      </div>

      {isDirection && (
        <p className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Las familias reservan entrevistas solo con los docentes que enseñan a sus hijos. Si dictas cursos o eres tutor(a) de un aula, publica aquí tus horarios.
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
              title={filter === 'PAST' ? 'Sin entrevistas en los últimos 7 días' : upcoming.length === 0 ? 'Aún no publicas horarios' : 'No hay horarios en esta sección'}
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
                        <li key={s.id} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/20 sm:px-5">
                          <div
                            className={cn(
                              'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                              isBooked ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground',
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
                                  isBooked ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
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
                            // En celular, botón cuadrado de 40 px (se toca bien y no tapa la hora); el texto, desde tablet
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
            <Button variant="outline" onClick={() => setCancelling(null)}>Volver</Button>
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

// ---------------------------------------------------------------- Familias

type ParentTab = 'BOOK' | 'MINE';

const ParentView: React.FC = () => {
  const { data: children = [], isLoading: loadingChildren } = useGetMyChildren();
  const { selectedChildId, setSelectedChildId } = useParentStore();
  const childId = useMemo(() => (children.some((c) => c.id === selectedChildId) ? selectedChildId : children[0]?.id ?? null), [children, selectedChildId]);
  useEffect(() => {
    if (childId && childId !== selectedChildId) setSelectedChildId(childId);
  }, [childId, selectedChildId, setSelectedChildId]);

  const { data: available, isLoading } = useAvailableSlots(childId);
  const { data: bookings } = useMyBookings(true);
  const book = useBookSlot();
  const cancel = useCancelBooking();
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
      { onSuccess: (c) => navigate(`/messages?c=${c.id}`), onError: (e) => toast.error(apiErrorMessage(e)) },
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
        onError: (e) => toast.error(apiErrorMessage(e)),
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
        onError: (e) => toast.error(apiErrorMessage(e)),
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
          <section className={panel}>
            {bookingCount === 0 ? (
              <EmptyBlock icon={<CalendarCheck2 />} title="No tienes entrevistas reservadas">
                Elige un horario libre en la pestaña Reservar.
              </EmptyBlock>
            ) : (
              <ul className="divide-y divide-border/60">
                {bookings!.map((b) => (
                  <li key={b.id} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/20 sm:px-5">
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
                    {/* Misma anticipación que para reservar (2 h); después, se coordina por Mensajes */}
                    {new Date(b.startsAt).getTime() - Date.now() >= CANCEL_NOTICE_MS ? (
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label="Cancelar entrevista"
                        // En celular, botón con texto y de 40 px de alto: se toca sin errar
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
                            onError: (e) => toast.error(apiErrorMessage(e)),
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
                Por ahora ningún docente de tu hijo(a) tiene horarios libres. Pídele uno y te avisaremos en cuanto lo publique.
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
                            onClick={() => setPicked({ id: s.id, label: `${staff.name} · ${day} · ${range(s)} · ${MODE_LABEL[s.mode]}` })}
                            className="flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-background px-3 py-2 text-sm font-bold sm:min-h-0 sm:text-xs text-foreground shadow-sm transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <ModeIcon mode={s.mode} className="h-3.5 w-3.5 text-muted-foreground" /> {formatPeruTime(s.startsAt)}
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
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Pedido el {formatPeruDate(staff.requestedAt!, { day: 'numeric', month: 'short' })}
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

      <Modal
        open={Boolean(picked)}
        onClose={() => setPicked(null)}
        title="Confirmar entrevista"
        description={picked?.label}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold" onClick={() => setPicked(null)}>
              Volver
            </Button>
            <Button
              size="sm"
              onClick={confirmBooking}
              disabled={reason.trim().length < 3 || book.isPending}
              className="gap-1.5 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
            >
              {book.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />} Reservar
            </Button>
          </div>
        }
      >
        <label className="mb-1 block text-xs font-bold text-foreground" htmlFor="meeting-reason">
          ¿Sobre qué te gustaría conversar?
        </label>
        <Textarea
          id="meeting-reason"
          className="rounded-xl text-sm"
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej.: quisiera saber cómo va en Matemática y cómo apoyarlo en casa."
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">{reason.length}/500</p>
      </Modal>

      <Modal
        open={Boolean(requesting)}
        onClose={() => setRequesting(null)}
        title="Pedir horario de entrevista"
        description={requesting ? `Le avisaremos a ${requesting.name} que quieres conversar. Cuando publique horarios, te llegará un aviso para reservar.` : undefined}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold" onClick={() => setRequesting(null)}>
              Volver
            </Button>
            <Button size="sm" onClick={confirmRequest} disabled={requestMeeting.isPending} className="gap-1.5 rounded-xl text-xs font-bold">
              {requestMeeting.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <CalendarPlus className="h-3.5 w-3.5" aria-hidden />} Pedir horario
            </Button>
          </div>
        }
      >
        <label className="mb-1 block text-xs font-bold text-foreground" htmlFor="meeting-request-message">
          Motivo (opcional)
        </label>
        <Textarea
          id="meeting-request-message"
          className="rounded-xl text-sm"
          rows={3}
          maxLength={500}
          value={requestMessage}
          onChange={(e) => setRequestMessage(e.target.value)}
          placeholder="Ej.: quisiera conversar sobre sus notas del bimestre."
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">{requestMessage.length}/500</p>
      </Modal>
    </div>
  );
};

export const MeetingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isParent = user?.role === 'PARENT';
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
          <CalendarClock className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-foreground">Entrevistas</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {isParent
              ? 'Reserva una cita con el tutor o los docentes de tu hijo(a), o pídeles un horario, sin llamadas ni cuaderno de control.'
              : 'Publica tus horarios de atención y las familias reservan desde su app. Reciben un recordatorio la víspera.'}
          </p>
        </div>
      </div>
      {isParent ? <ParentView /> : <StaffView />}
    </div>
  );
};
