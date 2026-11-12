import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BookOpen,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Copy,
  CreditCard,
  Loader2,
  MapPin,
  PartyPopper,
  Pencil,
  Rss,
  Trash2,
  UserRound,
  CalendarDays,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import { formatPeruDate, getPeruToday } from '@/lib/dateUtils';
import { useAuthStore } from '@/store/useAuthStore';
import { useClassrooms } from '@/features/classrooms/api/useClassrooms';
import { apiErrorMessage } from '@/features/academic/api';
import {
  EVENT_TYPE_LABEL,
  useCalendar,
  useCalendarFeedUrl,
  useDeleteEvent,
  useSaveEvent,
  type CalendarItem,
  type EventInput,
  type EventType,
} from '../api/useCalendar';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const KIND_STYLE: Record<string, string> = {
  HOLIDAY: 'bg-rose-500/10 text-rose-800 dark:text-rose-200',
  HOMEWORK: 'bg-amber-500/10 text-amber-800 dark:text-amber-200',
  MEETING: 'bg-violet-500/10 text-violet-800 dark:text-violet-200',
  PAYMENT: 'bg-teal-500/10 text-teal-800 dark:text-teal-200',
  EXAM: 'bg-sky-500/15 text-sky-800 dark:text-sky-200',
  EVENT: 'bg-primary/10 text-primary',
};
const styleOf = (i: CalendarItem) => (i.kind === 'EVENT' && i.eventType === 'EXAM' ? KIND_STYLE.EXAM : KIND_STYLE[i.kind]);

const KindIcon: React.FC<{ item: CalendarItem; className?: string }> = ({ item, className }) => {
  const Icon = item.kind === 'HOLIDAY' ? PartyPopper : item.kind === 'HOMEWORK' ? BookOpen : item.kind === 'MEETING' ? UserRound : item.kind === 'PAYMENT' ? CreditCard : CalendarDays;
  return <Icon className={className} aria-hidden />;
};

const kindLabel = (i: CalendarItem) =>
  i.kind === 'HOLIDAY' ? 'Feriado' : i.kind === 'HOMEWORK' ? 'Tarea' : i.kind === 'MEETING' ? 'Entrevista' : i.kind === 'PAYMENT' ? 'Pago' : EVENT_TYPE_LABEL[i.eventType ?? 'OTHER'];

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const addDaysStr = (s: string, n: number) => {
  const d = new Date(`${s}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Celdas del mes (semanas de lunes a domingo). */
function monthCells(year: number, month: number) {
  const first = ymd(year, month, 1);
  const firstWeekday = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7; // 0 = lunes
  const start = addDaysStr(first, -firstWeekday);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const total = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  return { start, end: addDaysStr(start, total - 1), cells: Array.from({ length: total }, (_, i) => addDaysStr(start, i)) };
}

/** Un evento de varios días aparece en cada día del rango. */
function itemsByDay(items: CalendarItem[]) {
  const map = new Map<string, CalendarItem[]>();
  for (const it of items) {
    let d = it.date;
    const last = it.endDate ?? it.date;
    for (let guard = 0; d <= last && guard < 60; guard++, d = addDaysStr(d, 1)) map.set(d, [...(map.get(d) ?? []), it]);
  }
  return map;
}

const emptyEvent = (date: string): EventInput => ({
  title: '',
  description: '',
  type: 'ACTIVITY',
  startDate: date,
  endDate: null,
  startTime: null,
  endTime: null,
  location: '',
  classroomId: null,
  educationLevel: null,
  visibleToFamilies: true,
  notifyFamilies: false,
});

const EventModal: React.FC<{ open: boolean; onClose: () => void; initial: EventInput; editingId?: string; isTeacher: boolean }> = ({ open, onClose, initial, editingId, isTeacher }) => {
  const [form, setForm] = useState<EventInput>(initial);
  const [scope, setScope] = useState<string>(initial.classroomId ? `c:${initial.classroomId}` : initial.educationLevel ? `l:${initial.educationLevel}` : 'all');
  React.useEffect(() => {
    setForm(initial);
    setScope(initial.classroomId ? `c:${initial.classroomId}` : initial.educationLevel ? `l:${initial.educationLevel}` : isTeacher ? '' : 'all');
  }, [initial, isTeacher]);
  const { data: classrooms = [] } = useClassrooms();
  const save = useSaveEvent();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const input: EventInput = {
      ...form,
      classroomId: scope.startsWith('c:') ? scope.slice(2) : null,
      educationLevel: scope.startsWith('l:') ? (scope.slice(2) as EventInput['educationLevel']) : null,
      endDate: form.endDate || null,
      startTime: form.startTime || null,
      endTime: form.startTime ? form.endTime || null : null,
      location: form.location || null,
      description: form.description || null,
    };
    save.mutate(
      { id: editingId, input },
      {
        onSuccess: (r: { notified?: number }) => {
          toast.success(r?.notified ? `Evento guardado y avisado a ${r.notified} familia(s).` : 'Evento guardado.');
          onClose();
        },
        onError: (err) => toast.error(apiErrorMessage(err)),
      },
    );
  };

  const field = 'h-9';
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingId ? 'Editar evento' : 'Nuevo evento'}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="event-form" disabled={save.isPending} className="gap-2">
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Guardar
          </Button>
        </div>
      }
    >
      <form id="event-form" onSubmit={submit} className="grid grid-cols-2 gap-3">
        <label className="col-span-2 text-xs text-muted-foreground">
          Título
          <Input className={field} required minLength={3} maxLength={150} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej.: Día del Logro" />
        </label>
        <label className="text-xs text-muted-foreground">
          Tipo
          <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as EventType })}>
            {(Object.keys(EVENT_TYPE_LABEL) as EventType[]).map((t) => (
              <option key={t} value={t}>{EVENT_TYPE_LABEL[t]}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Para
          <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground" value={scope} onChange={(e) => setScope(e.target.value)} required>
            {isTeacher ? <option value="">Elige un aula…</option> : <option value="all">Todo el colegio</option>}
            {!isTeacher && (
              <>
                <option value="l:INITIAL">Solo Inicial</option>
                <option value="l:PRIMARY">Solo Primaria</option>
                <option value="l:SECONDARY">Solo Secundaria</option>
              </>
            )}
            {classrooms.map((c) => (
              <option key={c.id} value={`c:${c.id}`}>
                {c.educationLevel === 'INITIAL' ? `${c.grade} años` : `${c.grade}.°`} "{c.section}" · {c.educationLevel === 'INITIAL' ? 'Inicial' : c.educationLevel === 'PRIMARY' ? 'Primaria' : 'Secundaria'}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Desde
          <Input type="date" className={field} required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        </label>
        <label className="text-xs text-muted-foreground">
          Hasta (opcional)
          <Input type="date" className={field} min={form.startDate} value={form.endDate ?? ''} onChange={(e) => setForm({ ...form, endDate: e.target.value || null })} />
        </label>
        <label className="text-xs text-muted-foreground">
          Hora de inicio (opcional)
          <Input type="time" className={field} value={form.startTime ?? ''} onChange={(e) => setForm({ ...form, startTime: e.target.value || null })} />
        </label>
        <label className="text-xs text-muted-foreground">
          Hora de fin
          <Input type="time" className={field} disabled={!form.startTime} value={form.endTime ?? ''} onChange={(e) => setForm({ ...form, endTime: e.target.value || null })} />
        </label>
        <label className="col-span-2 text-xs text-muted-foreground">
          Lugar (opcional)
          <Input className={field} maxLength={200} value={form.location ?? ''} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </label>
        <label className="col-span-2 text-xs text-muted-foreground">
          Detalle (opcional)
          <Textarea rows={3} maxLength={2000} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <label className="col-span-2 flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={form.visibleToFamilies} onChange={(e) => setForm({ ...form, visibleToFamilies: e.target.checked })} />
          Visible para las familias
        </label>
        {!editingId && form.visibleToFamilies && (
          <label className="col-span-2 flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={Boolean(form.notifyFamilies)} onChange={(e) => setForm({ ...form, notifyFamilies: e.target.checked })} />
            Avisar ahora a las familias (notificación y push)
          </label>
        )}
      </form>
    </Modal>
  );
};

const FeedModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { data, isLoading } = useCalendarFeedUrl(open);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Enlace copiado');
    } catch {
      toast.error('No se pudo copiar; selecciónalo manualmente.');
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Ver el calendario en tu celular" description="Se actualiza solo: los nuevos eventos, tareas y entrevistas aparecen automáticamente." size="md">
      {isLoading || !data ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" aria-label="Cargando" /></div>
      ) : (
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium text-foreground">iPhone, iPad o Mac</p>
            <a href={data.webcalUrl} className="mt-1 inline-flex items-center gap-1.5 text-primary hover:underline">
              <Rss className="h-4 w-4" aria-hidden /> Suscribirme al calendario
            </a>
          </div>
          <div>
            <p className="font-medium text-foreground">Google Calendar (Android o computadora)</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-muted-foreground">
              <li>Copia el enlace de abajo.</li>
              <li>En calendar.google.com → “Otros calendarios” → “+” → “Desde URL”.</li>
              <li>Pega el enlace y pulsa “Agregar calendario”.</li>
            </ol>
            <div className="mt-2 flex gap-2">
              <Input readOnly value={data.httpsUrl} className="h-9 text-xs" onFocus={(e) => e.currentTarget.select()} aria-label="Enlace de suscripción" />
              <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={() => copy(data.httpsUrl)}>
                <Copy className="h-3.5 w-3.5" aria-hidden /> Copiar
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">Este enlace es personal; no lo compartas. Deja de funcionar si cambias tu contraseña.</p>
        </div>
      )}
    </Modal>
  );
};

export const CalendarPage: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role;
  const canCreate = role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN' || role === 'ADMINISTRATIVE' || role === 'TEACHER';
  const today = getPeruToday();
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) }));
  const [selected, setSelected] = useState(today);
  const [editor, setEditor] = useState<{ initial: EventInput; id?: string } | null>(null);
  const [feedOpen, setFeedOpen] = useState(false);
  const del = useDeleteEvent();

  const { start, end, cells } = useMemo(() => monthCells(ym.y, ym.m), [ym]);
  const { data: items = [], isLoading } = useCalendar(start, end);
  const byDay = useMemo(() => itemsByDay(items), [items]);
  const dayItems = byDay.get(selected) ?? [];
  const monthTitle = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(ym.y, ym.m - 1, 15)));

  const move = (delta: number) => setYm(({ y, m }) => {
    const n = m + delta;
    return n < 1 ? { y: y - 1, m: 12 } : n > 12 ? { y: y + 1, m: 1 } : { y, m: n };
  });

  const edit = (i: CalendarItem) =>
    setEditor({
      id: i.id,
      initial: {
        title: i.title,
        description: i.description ?? '',
        type: i.eventType ?? 'OTHER',
        startDate: i.date,
        endDate: i.endDate ?? null,
        startTime: i.startTime ?? null,
        endTime: i.endTime ?? null,
        location: i.location ?? '',
        classroomId: i.classroomId ?? null,
        educationLevel: i.educationLevel ?? null,
        visibleToFamilies: i.visibleToFamilies ?? true,
      },
    });

  const selectedLabel = formatPeruDate(selected, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Calendario escolar"
        description="Evaluaciones, actividades, feriados, tareas, entrevistas y pagos en un solo lugar."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setFeedOpen(true)}>
              <Rss className="h-4 w-4" aria-hidden /> En mi celular
            </Button>
            {canCreate && (
              <Button size="sm" className="gap-1.5" onClick={() => setEditor({ initial: emptyEvent(selected) })}>
                <CalendarPlus className="h-4 w-4" aria-hidden /> Nuevo evento
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-3 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => move(-1)} aria-label="Mes anterior"><ChevronLeft className="h-4 w-4" /></Button>
            <h2 className="text-sm font-semibold text-foreground first-letter:uppercase">{monthTitle}</h2>
            <Button variant="ghost" size="icon" onClick={() => move(1)} aria-label="Mes siguiente"><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border text-xs">
            {WEEKDAYS.map((w) => (
              <div key={w} className="bg-muted/60 py-1.5 text-center font-semibold text-muted-foreground">{w}</div>
            ))}
            {cells.map((d) => {
              const inMonth = Number(d.slice(5, 7)) === ym.m;
              const list = byDay.get(d) ?? [];
              const isHoliday = list.some((i) => i.kind === 'HOLIDAY');
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelected(d)}
                  aria-label={`${d}, ${list.length} elementos`}
                  aria-pressed={selected === d}
                  className={cn(
                    'min-h-[64px] bg-card p-1 text-left align-top transition-colors hover:bg-muted/50 sm:min-h-[84px]',
                    !inMonth && 'bg-muted/30 text-muted-foreground',
                    isHoliday && 'bg-rose-500/5',
                    selected === d && 'ring-2 ring-inset ring-primary',
                  )}
                >
                  <span className={cn('inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]', d === today && 'bg-primary font-bold text-primary-foreground')}>
                    {Number(d.slice(8, 10))}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {list.slice(0, 2).map((i) => (
                      <p key={`${i.kind}-${i.id}`} className={cn('hidden truncate rounded px-1 text-[10px] sm:block', styleOf(i))}>{i.title}</p>
                    ))}
                    {list.length > 0 && (
                      <p className="flex gap-0.5 sm:hidden">
                        {list.slice(0, 4).map((i) => (
                          <span key={`${i.kind}-${i.id}`} className={cn('h-1.5 w-1.5 rounded-full', styleOf(i).split(' ')[0].replace('/10', '').replace('/15', ''))} />
                        ))}
                      </p>
                    )}
                    {list.length > 2 && <p className="hidden text-[10px] text-muted-foreground sm:block">+{list.length - 2} más</p>}
                  </div>
                </button>
              );
            })}
          </div>
          {isLoading && <p className="mt-2 text-xs text-muted-foreground">Cargando…</p>}
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground first-letter:uppercase">{selectedLabel}</h2>
          {dayItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada programado.</p>
          ) : (
            <ul className="space-y-3">
              {dayItems.map((i) => (
                <li key={`${i.kind}-${i.id}`} className="rounded-lg border border-border p-3">
                  <div className="flex items-start gap-2">
                    <span className={cn('mt-0.5 rounded-md p-1', styleOf(i))}><KindIcon item={i} className="h-3.5 w-3.5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-muted-foreground">
                        {kindLabel(i)}
                        {i.startTime ? ` · ${i.startTime}${i.endTime ? `–${i.endTime}` : ''}` : ''}
                        {i.scope ? ` · ${i.scope}` : ''}
                        {i.studentName ? ` · ${i.studentName}` : ''}
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {i.link ? <Link to={i.link} className="hover:underline">{i.title}</Link> : i.title}
                      </p>
                      {i.location && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" aria-hidden /> {i.location}</p>
                      )}
                      {i.description && <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{i.description}</p>}
                    </div>
                    {i.kind === 'EVENT' && i.editable && (
                      <div className="flex shrink-0 gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => edit(i)} aria-label="Editar evento"><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label="Eliminar evento"
                          onClick={() =>
                            window.confirm('¿Eliminar este evento?') &&
                            del.mutate(i.id, { onSuccess: () => toast.success('Evento eliminado'), onError: (e) => toast.error(apiErrorMessage(e)) })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {canCreate && (
            <Button variant="outline" size="sm" className="mt-3 w-full gap-1.5" onClick={() => setEditor({ initial: emptyEvent(selected) })}>
              <CalendarPlus className="h-4 w-4" aria-hidden /> Agregar evento este día
            </Button>
          )}
        </Card>
      </div>

      {editor && <EventModal open onClose={() => setEditor(null)} initial={editor.initial} editingId={editor.id} isTeacher={role === 'TEACHER'} />}
      <FeedModal open={feedOpen} onClose={() => setFeedOpen(false)} />
    </div>
  );
};
