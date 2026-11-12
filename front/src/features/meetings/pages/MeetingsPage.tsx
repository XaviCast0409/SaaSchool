import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CalendarClock, CalendarPlus, Loader2, MapPin, Phone, Trash2, User, Video, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
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
  const field = 'h-9';
  return (
    <Card className="p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <CalendarPlus className="h-4 w-4 text-primary" aria-hidden /> Publicar horarios de atención
      </h2>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <label className="col-span-2 text-xs text-muted-foreground sm:col-span-1">
          Día
          <Input type="date" className={field} min={getPeruToday()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        </label>
        <label className="text-xs text-muted-foreground">
          Desde
          <Input type="time" className={field} value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} required />
        </label>
        <label className="text-xs text-muted-foreground">
          Hasta
          <Input type="time" className={field} value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} required />
        </label>
        <label className="text-xs text-muted-foreground">
          Cada
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
            value={form.durationMinutes}
            onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
          >
            {[15, 20, 30, 45, 60].map((m) => (
              <option key={m} value={m}>{m} min</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Modalidad
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
            value={form.mode}
            onChange={(e) => setForm({ ...form, mode: e.target.value as MeetingMode })}
          >
            {(Object.keys(MODE_LABEL) as MeetingMode[]).map((m) => (
              <option key={m} value={m}>{MODE_LABEL[m]}</option>
            ))}
          </select>
        </label>
        <label className="col-span-2 text-xs text-muted-foreground sm:col-span-3 lg:col-span-1">
          Lugar o enlace
          <Input className={field} placeholder="Aula 3B / enlace Meet" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={200} />
        </label>
        <div className="col-span-2 sm:col-span-3 lg:col-span-6">
          <Button type="submit" disabled={create.isPending} className="gap-2">
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Publicar horarios
          </Button>
        </div>
      </form>
    </Card>
  );
};

const StaffView: React.FC = () => {
  const { data, isLoading } = useMySlots(true);
  const cancel = useCancelSlot();
  const now = Date.now();
  const upcoming = (data ?? []).filter((s) => new Date(s.endsAt).getTime() >= now);
  const booked = upcoming.filter((s) => s.status === 'BOOKED').length;

  const onCancel = (s: MeetingSlot) => {
    const msg = s.status === 'BOOKED' ? '¿Cancelar esta entrevista? Se avisará a la familia.' : '¿Quitar este horario?';
    if (!window.confirm(msg)) return;
    cancel.mutate(s.id, { onSuccess: () => toast.success('Listo'), onError: (e) => toast.error(apiErrorMessage(e)) });
  };

  return (
    <div className="space-y-4">
      <PublishSlotsCard />
      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Mis próximos horarios</h2>
          <span className="text-xs text-muted-foreground">
            {booked} reservado(s) de {upcoming.length}
          </span>
        </div>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no publicas horarios. Las familias de tus alumnos podrán reservarlos desde su app.</p>
        ) : (
          <div className="space-y-4">
            {groupByDay(upcoming).map(([day, slots]) => (
              <div key={day}>
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{day}</p>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {slots.map((s) => (
                    <li key={s.id} className="flex items-start gap-3 px-3 py-2.5">
                      <ModeIcon mode={s.mode} className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="font-medium text-foreground">
                          {range(s)}{' '}
                          <span className={cn('ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', s.status === 'BOOKED' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground')}>
                            {s.status === 'BOOKED' ? 'Reservado' : 'Libre'}
                          </span>
                        </p>
                        {s.status === 'BOOKED' && s.parent && (
                          <p className="text-xs text-muted-foreground">
                            {s.parent.firstName} {s.parent.lastNamePaternal}
                            {s.student ? ` · ${s.student.name}` : ''}
                            {s.parent.cellphone ? ` · ${s.parent.cellphone}` : ''}
                            {s.reason ? ` — “${s.reason}”` : ''}
                          </p>
                        )}
                        {s.location && <p className="text-xs text-muted-foreground">{s.location}</p>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onCancel(s)} aria-label={s.status === 'BOOKED' ? 'Cancelar entrevista' : 'Quitar horario'}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------- Familias

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

  if (loadingChildren) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <ChildSwitcher childrenList={children} selectedId={childId ?? ''} onSelect={setSelectedChildId} />

      {bookings && bookings.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Mis entrevistas reservadas</h2>
          <ul className="divide-y divide-border">
            {bookings.map((b) => (
              <li key={b.id} className="flex items-start gap-3 py-2.5">
                <ModeIcon mode={b.mode} className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium text-foreground">
                    {dayLabel(b.startsAt)} · {range(b)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {b.staffName} · {MODE_LABEL[b.mode]}
                    {b.location ? ` · ${b.location}` : ''}
                    {b.student ? ` · ${b.student.name}` : ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => window.confirm('¿Cancelar esta entrevista?') && cancel.mutate(b.id, { onSuccess: () => toast.success('Entrevista cancelada'), onError: (e) => toast.error(apiErrorMessage(e)) })}
                >
                  <X className="h-3.5 w-3.5" aria-hidden /> Cancelar
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Reservar una entrevista</h2>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !available || available.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Por ahora ningún docente de tu hijo(a) tiene horarios libres. También puedes escribirles desde <strong>Mensajes</strong>.
          </p>
        ) : (
          <div className="space-y-5">
            {available.map((staff) => (
              <div key={staff.id}>
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <User className="h-4 w-4 text-muted-foreground" aria-hidden /> {staff.name}
                  <span className="text-xs font-normal text-muted-foreground">
                    {staff.roleLabel}
                    {staff.subjects.length ? ` · ${staff.subjects.join(', ')}` : ''}
                  </span>
                </p>
                <div className="mt-2 space-y-2">
                  {groupByDay(staff.slots).map(([day, slots]) => (
                    <div key={day}>
                      <p className="text-xs text-muted-foreground">{day}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {slots.map((s) => (
                          <Button
                            key={s.id}
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            onClick={() => setPicked({ id: s.id, label: `${staff.name} · ${day} · ${range(s)} · ${MODE_LABEL[s.mode]}` })}
                          >
                            <ModeIcon mode={s.mode} className="h-3 w-3" /> {formatPeruTime(s.startsAt)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(picked)}
        onClose={() => setPicked(null)}
        title="Confirmar entrevista"
        description={picked?.label}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPicked(null)}>Volver</Button>
            <Button onClick={confirmBooking} disabled={reason.trim().length < 3 || book.isPending} className="gap-2">
              {book.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Reservar
            </Button>
          </div>
        }
      >
        <label className="block text-sm font-medium text-foreground" htmlFor="meeting-reason">
          ¿Sobre qué te gustaría conversar?
        </label>
        <Textarea
          id="meeting-reason"
          className="mt-1.5"
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej.: quisiera saber cómo va en Matemática y cómo apoyarlo en casa."
        />
      </Modal>
    </div>
  );
};

export const MeetingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isParent = user?.role === 'PARENT';
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Entrevistas"
        description={
          isParent
            ? 'Reserva una cita con el tutor o los docentes de tu hijo(a), sin llamadas ni cuaderno de control.'
            : 'Publica tus horarios de atención y las familias reservan desde su app. Reciben un recordatorio la víspera.'
        }
        actions={<CalendarClock className="hidden h-6 w-6 text-muted-foreground sm:block" aria-hidden />}
      />
      {isParent ? <ParentView /> : <StaffView />}
    </div>
  );
};
