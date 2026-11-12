import React from 'react';
import { Link } from 'react-router-dom';
import { Backpack, CalendarDays, CheckCircle2, Circle, Coffee, PartyPopper } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPeruDate, getPeruToday } from '@/lib/dateUtils';
import { useDayAgenda } from '../api/useSchedule';

const EVENT_LABEL: Record<string, string> = {
  EXAM: 'Evaluación',
  ACTIVITY: 'Actividad',
  MEETING: 'Reunión',
  CIVIC: 'Fecha cívica',
  DEADLINE: 'Fecha límite',
  OTHER: 'Evento',
};

function dayTitle(date: string): string {
  const today = getPeruToday();
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  const tomorrow = d.toISOString().slice(0, 10);
  if (date === today) return 'Hoy';
  if (date === tomorrow) return 'Mañana';
  const label = formatPeruDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "¿Qué toca mañana?": clases, tareas que vencen y eventos del próximo día lectivo. */
export const NextDayCard: React.FC<{ studentId: string | null; compact?: boolean }> = ({ studentId, compact }) => {
  const { data, isLoading } = useDayAgenda(studentId);
  if (!studentId) return null;
  if (isLoading || !data) return <Skeleton className="h-40 w-full rounded-xl" />;

  const courses = data.blocks.filter((b) => b.courseAssignmentId);
  const pendingHw = data.homeworks.filter((h) => !h.submitted);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-primary/5 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Backpack className="h-4 w-4 text-primary" aria-hidden />
          ¿Qué toca? · {dayTitle(data.date)}
        </h2>
        {data.studentName && <span className="text-xs text-muted-foreground">{data.studentName}</span>}
      </div>
      <div className="space-y-4 p-4">
        {data.holiday ? (
          <p className="flex items-center gap-2 text-sm text-foreground">
            <PartyPopper className="h-4 w-4 text-amber-500" aria-hidden /> No hay clases: {data.holiday}
          </p>
        ) : courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">El colegio aún no publica el horario de esta aula.</p>
        ) : (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Clases</p>
            <ol className="space-y-1">
              {(compact ? data.blocks.slice(0, 8) : data.blocks).map((b, i) => (
                <li key={`${b.startTime}-${i}`} className="flex items-baseline gap-2 text-sm">
                  <span className="w-12 shrink-0 font-mono text-[11px] text-muted-foreground">{b.startTime}</span>
                  {b.courseAssignmentId ? (
                    <span className="text-foreground">{b.courseName}</span>
                  ) : (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Coffee className="h-3 w-3" aria-hidden /> {b.label || 'Recreo'}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {data.homeworks.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tareas que vencen {pendingHw.length ? `(${pendingHw.length} pendiente${pendingHw.length > 1 ? 's' : ''})` : ''}
            </p>
            <ul className="space-y-1">
              {data.homeworks.map((h) => (
                <li key={h.id} className="flex items-start gap-2 text-sm">
                  {h.submitted ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Entregada" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-label="Pendiente" />
                  )}
                  <span className="text-foreground">
                    <strong className="font-medium">{h.courseName}:</strong> {h.title}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.events.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">En el calendario</p>
            <ul className="space-y-1">
              {data.events.map((e) => (
                <li key={e.id} className="flex items-start gap-2 text-sm text-foreground">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>
                    <span className="text-xs text-muted-foreground">{EVENT_LABEL[e.type] ?? 'Evento'} · </span>
                    {e.title}
                    {e.startTime ? <span className="text-muted-foreground"> · {e.startTime}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {compact && (
          <Link to="/schedule" className="inline-block text-xs font-medium text-primary hover:underline">
            Ver horario completo →
          </Link>
        )}
      </div>
    </Card>
  );
};
