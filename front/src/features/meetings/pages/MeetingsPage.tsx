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
import {
  MODE_LABEL,
  useAvailableSlots,
  useBookSlot,
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
        {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
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
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
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
  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-secondary-foreground">
    <ModeIcon mode={mode} className="h-3 w-3" /> {MODE_LABEL[mode]}
  </span>
);

const StatTile: React.FC<{ label: string; value: number; icon: React.ReactNode; tone: string }> = ({ label, value, icon, tone }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
    <div className={cn('hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:flex', tone)}>{icon}</div>
    <div className="min-w-0">
      <p className="text-xl font-black leading-none text-foreground">{value}</p>
      <p className="mt-1 truncate text-[11px] font-semibold text-muted-foreground">{label}</p>
    </div>
  </div>
);

/** Bloque con día y mes, para listas cronológicas. */
const DateChip: React.FC<{ iso: string }> = ({ iso }) => (
  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
    <span className="text-lg font-black leading-none">{formatPeruDate(iso, { day: 'numeric' })}</span>
    <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider">{formatPeruDate(iso, { month: 'short' }).replace('.', '')}</span>
  </div>
);

const fieldLabel = 'block min-w-0 space-y-1 [&>span]:block [&>span]:truncate text-[11px] font-bold uppercase tracking-wider text-muted-foreground';
const fieldControl = 'h-10 rounded-xl text-sm normal-case tracking-normal font-normal';
const selectControl =
  'h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

// ---------------------------------------------------------------- Personal

const PublishSlotsCard: React.FC = () => {
  const create = useCreateSlots();
  const [form, setForm] = useState({ date: getPeruToday(), from: '14:00', to: '16:00', durationMinutes: 20, mode: 'IN_PERSON' as MeetingMode, location: '' });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      { ...form, location: form.location || undefined },
      {
        onSuccess: (r) => toast.success(r.skipped ? `${r.created} horario(s) publicados; ${r.skipped} se omitieron por cruce.` : `${r.created} horario(s) publicados.`),
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
      <form onSubmit={submit} className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5 lg:grid-cols-6">
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
        <label className={cn(fieldLabel, 'col-span-2 sm:col-span-3 lg:col-span-1')}>
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

type SlotFilter = 'ALL' | 'BOOKED' | 'AVAILABLE';

const StaffView: React.FC = () => {
  const { data, isLoading } = useMySlots(true);
  const cancel = useCancelSlot();
  const [filter, setFilter] = useState<SlotFilter>('ALL');
  const now = Date.now();
  const upcoming = (data ?? []).filter((s) => new Date(s.endsAt).getTime() >= now);
  const booked = upcoming.filter((s) => s.status === 'BOOKED').length;
  const free = upcoming.length - booked;
  const visible = filter === 'ALL' ? upcoming : upcoming.filter((s) => (filter === 'BOOKED' ? s.status === 'BOOKED' : s.status !== 'BOOKED'));

  const onCancel = (s: MeetingSlot) => {
    const msg = s.status === 'BOOKED' ? '¿Cancelar esta entrevista? Se avisará a la familia.' : '¿Quitar este horario?';
    if (!window.confirm(msg)) return;
    cancel.mutate(s.id, { onSuccess: () => toast.success('Listo'), onError: (e) => toast.error(apiErrorMessage(e)) });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatTile label="Próximos" value={upcoming.length} icon={<CalendarDays className="h-4 w-4" />} tone="bg-primary/10 text-primary" />
        <StatTile label="Reservados" value={booked} icon={<CalendarCheck2 className="h-4 w-4" />} tone="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" />
        <StatTile label="Libres" value={free} icon={<Clock className="h-4 w-4" />} tone="bg-amber-500/15 text-amber-600 dark:text-amber-400" />
      </div>

      <PublishSlotsCard />

      <div className="space-y-3">
        <UnderlineTabs<SlotFilter>
          value={filter}
          onChange={setFilter}
          tabs={[
            { key: 'ALL', label: 'Todos', count: upcoming.length },
            { key: 'BOOKED', label: 'Reservados', count: booked },
            { key: 'AVAILABLE', label: 'Libres', count: free },
          ]}
        />

        <section className={panel}>
          {isLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          ) : visible.length === 0 ? (
            <EmptyBlock icon={<CalendarClock />} title={upcoming.length === 0 ? 'Aún no publicas horarios' : 'No hay horarios en esta sección'}>
              {upcoming.length === 0 ? 'Las familias de tus alumnos podrán reservarlos desde su app.' : 'Prueba con otra pestaña.'}
            </EmptyBlock>
          ) : (
            <div className="divide-y divide-border/60">
              {groupByDay(visible).map(([day, slots]) => (
                <div key={day}>
                  <p className="flex items-center gap-2 bg-muted/40 px-4 py-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground sm:px-5">
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
                              <span className="text-sm font-bold text-foreground">{range(s)}</span>
                              <span
                                className={cn(
                                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold',
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
                              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                                <span className="truncate">{s.location}</span>
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onCancel(s)}
                            disabled={cancel.isPending}
                            aria-label={isBooked ? 'Cancelar entrevista' : 'Quitar horario'}
                            className="h-8 shrink-0 gap-1 rounded-lg border-destructive/30 px-2.5 text-[11px] font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            {isBooked ? <XCircle className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">{isBooked ? 'Cancelar' : 'Quitar'}</span>
                          </Button>
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
                        <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          Confirmada
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{b.staffName}</span>
                        {b.student ? ` · ${b.student.name}` : ''}
                      </p>
                      {b.location && (
                        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                          <span className="truncate">{b.location}</span>
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label="Cancelar entrevista"
                      className="h-8 shrink-0 gap-1 rounded-lg border-destructive/30 px-2.5 text-[11px] font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => window.confirm('¿Cancelar esta entrevista?') && cancel.mutate(b.id, { onSuccess: () => toast.success('Entrevista cancelada'), onError: (e) => toast.error(apiErrorMessage(e)) })}
                    >
                      <XCircle className="h-3.5 w-3.5" aria-hidden />
                      <span className="hidden sm:inline">Cancelar</span>
                    </Button>
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
            <EmptyBlock icon={<CalendarClock />} title="Aún no hay horarios libres">
              Por ahora ningún docente de tu hijo(a) tiene horarios libres. También puedes escribirles desde Mensajes.
            </EmptyBlock>
          </section>
        ) : (
          <div className="space-y-4">
            {available.map((staff) => (
              <section key={staff.id} className={panel}>
                <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">
                    {staff.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h2 className="truncate text-sm font-black tracking-tight text-foreground">{staff.name}</h2>
                      {staff.isTutor && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          <GraduationCap className="h-3 w-3" aria-hidden /> Tutor(a)
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {staff.roleLabel}
                      {staff.subjects.length ? ` · ${staff.subjects.join(', ')}` : ''}
                    </p>
                  </div>
                </div>
                <div className="space-y-4 p-4 sm:p-5">
                  {groupByDay(staff.slots).map(([day, slots]) => (
                    <div key={day} className="space-y-2">
                      <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden /> {day}
                      </p>
                      <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 sm:flex sm:flex-wrap">
                        {slots.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            title={MODE_LABEL[s.mode]}
                            onClick={() => setPicked({ id: s.id, label: `${staff.name} · ${day} · ${range(s)} · ${MODE_LABEL[s.mode]}` })}
                            className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground shadow-sm transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
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
        <p className="mt-1 text-right text-[10px] text-muted-foreground">{reason.length}/500</p>
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
              ? 'Reserva una cita con el tutor o los docentes de tu hijo(a), sin llamadas ni cuaderno de control.'
              : 'Publica tus horarios de atención y las familias reservan desde su app. Reciben un recordatorio la víspera.'}
          </p>
        </div>
      </div>
      {isParent ? <ParentView /> : <StaffView />}
    </div>
  );
};
