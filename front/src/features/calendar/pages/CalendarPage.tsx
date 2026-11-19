import { confirmDialog } from '@/components/ui/confirm';
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  CalendarOff,
  CalendarPlus,
  Landmark,
  MapPin,
  Pencil,
  Rss,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPeruDate, getPeruToday } from '@/lib/dateUtils';
import { useAuthStore } from '@/store/useAuthStore';
import { getApiErrorMessage } from '@/lib/errors';
import { useQueryClient } from '@tanstack/react-query';
import { HolidaysModal } from '@/features/attendance/components/HolidaysModal';
import {
  CALENDAR_EVENTS_QUERY_KEY,
  useCalendar,
  useDeleteEvent,
  useImportOfficialDates,
  type CalendarItem,
  type EventInput,
} from '../api/useCalendar';
import { emptyEvent, kindLabel, styleOf } from '../constants';
import { itemsByDay, monthCells } from '../utils/calendarGrid';
import { CalendarGrid } from '../components/calendar/CalendarGrid';
import { EventModal } from '../components/calendar/EventModal';
import { FeedModal } from '../components/calendar/FeedModal';
import { KindIcon } from '../components/calendar/KindIcon';

export const CalendarPage: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role;
  const canCreate =
    role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN' || role === 'ADMINISTRATIVE' || role === 'TEACHER';
  // Días sin clases propios del colegio (antes «Feriados» en Asistencia): Dirección y Secretaría
  const canManageHolidays = role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN' || role === 'ADMINISTRATIVE';
  const [holidaysOpen, setHolidaysOpen] = useState(false);
  const queryClient = useQueryClient();
  const today = getPeruToday();
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) }));
  const [selected, setSelected] = useState(today);
  const [editor, setEditor] = useState<{ initial: EventInput; id?: string } | null>(null);
  const [feedOpen, setFeedOpen] = useState(false);
  const del = useDeleteEvent();
  const importOfficial = useImportOfficialDates();
  const isManager = role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';

  const { start, end, cells } = useMemo(() => monthCells(ym.y, ym.m), [ym]);
  const { data: items = [], isLoading } = useCalendar(start, end);
  const byDay = useMemo(() => itemsByDay(items), [items]);
  const dayItems = byDay.get(selected) ?? [];
  const monthTitle = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(ym.y, ym.m - 1, 15)),
  );

  const move = (delta: number) =>
    setYm(({ y, m }) => {
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
            {isManager && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={importOfficial.isPending}
                onClick={async () => {
                  if (
                    !(await confirmDialog({
                      title: '¿Agregar feriados y fechas cívicas?',
                      description:
                        'Se agregarán los feriados nacionales (como días sin clases) y las fechas cívicas escolares del año lectivo. No se duplica lo que ya exista.',
                      confirmText: 'Agregar',
                      variant: 'info',
                    }))
                  )
                    return;
                  importOfficial.mutate(
                    { holidays: true, civic: true },
                    {
                      onSuccess: (r) =>
                        toast.success(
                          `Listo: ${r.holidaysCreated} feriado(s) y ${r.civicCreated} fecha(s) cívica(s) agregados.`,
                        ),
                      onError: (e) => toast.error(getApiErrorMessage(e)),
                    },
                  );
                }}
              >
                <Landmark className="h-4 w-4" aria-hidden /> Cargar fechas oficiales
              </Button>
            )}
            {canManageHolidays && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setHolidaysOpen(true)}>
                <CalendarOff className="h-4 w-4" aria-hidden /> Días sin clases
              </Button>
            )}
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
        <CalendarGrid
          ym={ym}
          cells={cells}
          byDay={byDay}
          selected={selected}
          today={today}
          isLoading={isLoading}
          monthTitle={monthTitle}
          onMove={move}
          onSelect={setSelected}
        />

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground first-letter:uppercase">{selectedLabel}</h2>
          {dayItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada programado.</p>
          ) : (
            <ul className="space-y-3">
              {dayItems.map((i) => (
                <li key={`${i.kind}-${i.id}`} className="rounded-lg border border-border p-3">
                  <div className="flex items-start gap-2">
                    <span className={cn('mt-0.5 rounded-md p-1', styleOf(i))}>
                      <KindIcon item={i} className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">
                        {kindLabel(i)}
                        {i.startTime ? ` · ${i.startTime}${i.endTime ? `–${i.endTime}` : ''}` : ''}
                        {i.scope ? ` · ${i.scope}` : ''}
                        {i.studentName ? ` · ${i.studentName}` : ''}
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {i.link ? (
                          <Link to={i.link} className="hover:underline">
                            {i.title}
                          </Link>
                        ) : (
                          i.title
                        )}
                      </p>
                      {i.location && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" aria-hidden /> {i.location}
                        </p>
                      )}
                      {i.description && (
                        <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{i.description}</p>
                      )}
                    </div>
                    {i.kind === 'EVENT' && i.editable && (
                      <div className="flex shrink-0 gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => edit(i)}
                          aria-label="Editar evento"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label="Eliminar evento"
                          onClick={async () =>
                            (await confirmDialog({
                              title: '¿Eliminar este evento?',
                              confirmText: 'Eliminar',
                              variant: 'danger',
                            })) &&
                            del.mutate(i.id, {
                              onSuccess: () => toast.success('Evento eliminado'),
                              onError: (e) => toast.error(getApiErrorMessage(e)),
                            })
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
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full gap-1.5"
              onClick={() => setEditor({ initial: emptyEvent(selected) })}
            >
              <CalendarPlus className="h-4 w-4" aria-hidden /> Agregar evento este día
            </Button>
          )}
        </Card>
      </div>

      {editor && (
        <EventModal
          open
          onClose={() => setEditor(null)}
          initial={editor.initial}
          editingId={editor.id}
          isTeacher={role === 'TEACHER'}
        />
      )}
      <FeedModal open={feedOpen} onClose={() => setFeedOpen(false)} />
      {holidaysOpen && (
        <HolidaysModal
          isOpen={holidaysOpen}
          onClose={() => {
            setHolidaysOpen(false);
            // Los días sin clases se pintan en el calendario
            queryClient.invalidateQueries({ queryKey: CALENDAR_EVENTS_QUERY_KEY });
          }}
        />
      )}
    </div>
  );
};
