import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  CalendarClock,
  CreditCard,
  DoorOpen,
  FileText,
  GraduationCap,
  Megaphone,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatPeruDate, formatPeruTime, getPeruToday } from '@/lib/dateUtils';
import { useFamilyOverview, useFamilyTimeline, type ChildOverview, type Light, type TimelineItem } from '../api/useFamily';

const LIGHT_STYLE: Record<Light, { dot: string; bg: string; label: string }> = {
  GREEN: { dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', label: 'Bien' },
  YELLOW: { dot: 'bg-amber-400', bg: 'bg-amber-500/10', label: 'Atención' },
  RED: { dot: 'bg-rose-500', bg: 'bg-rose-500/10', label: 'Revisar' },
  GRAY: { dot: 'bg-muted-foreground/40', bg: 'bg-muted', label: 'Sin datos' },
};

const LINK_OF: Record<string, string> = { Asistencia: '/attendance', Notas: '/grades', Tareas: '/virtual-classroom', Pagos: '/payments' };

/** Semáforo del hijo: cuatro indicadores de un vistazo. */
export const ChildLights: React.FC<{ child: ChildOverview }> = ({ child }) => (
  <div className={cn('grid gap-2', child.lights.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3')}>
    {child.lights.map((l) => {
      const st = LIGHT_STYLE[l.light];
      return (
        <Link key={l.label} to={LINK_OF[l.label] ?? '/dashboard'} className={cn('rounded-xl p-3 transition-shadow hover:shadow-sm', st.bg)} aria-label={`${l.label}: ${st.label}. ${l.detail}`}>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <span className={cn('h-2.5 w-2.5 rounded-full', st.dot)} aria-hidden /> {l.label}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{l.detail}</p>
        </Link>
      );
    })}
  </div>
);

export const ChildLightsCard: React.FC<{ studentId: string | null }> = ({ studentId }) => {
  const { data, isLoading } = useFamilyOverview();
  const child = data?.find((c) => c.studentId === studentId) ?? data?.[0];
  if (isLoading) return <Skeleton className="h-28 w-full rounded-xl" />;
  if (!child) return null;
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground">¿Cómo va {child.name.split(' ')[0]}?</h2>
      <ChildLights child={child} />
    </Card>
  );
};

/** Insignias del alumno (personales, sin rankings). */
export const BadgesCard: React.FC<{ studentId: string | null }> = ({ studentId }) => {
  const { data, isLoading } = useFamilyOverview();
  const child = data?.find((c) => c.studentId === studentId) ?? data?.[0];
  if (isLoading) return <Skeleton className="h-32 w-full rounded-xl" />;
  if (!child) return null;
  const earned = child.badges.filter((b) => b.earned).length;
  return (
    <Card className="p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkles className="h-4 w-4 text-amber-500" aria-hidden /> Mis insignias
        <span className="text-xs font-normal text-muted-foreground">
          {earned} de {child.badges.length}
        </span>
      </h2>
      <p className="mb-3 text-[11px] text-muted-foreground">Solo las ves tú y tu familia.</p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {child.badges.map((b) => (
          <li
            key={b.id}
            title={b.description}
            className={cn('rounded-xl border p-3 text-center', b.earned ? 'border-amber-400/50 bg-amber-500/10' : 'border-dashed border-border opacity-70')}
          >
            <div className={cn('text-2xl', !b.earned && 'grayscale')} aria-hidden>
              {b.emoji}
            </div>
            <p className="mt-1 text-xs font-semibold text-foreground">{b.title}</p>
            <p className="text-[10px] text-muted-foreground">{b.earned ? '¡Conseguida!' : b.progress ?? b.description}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
};

const KIND_ICON: Record<TimelineItem['kind'], React.ElementType> = {
  ATTENDANCE: DoorOpen,
  HOMEWORK: BookOpen,
  MATERIAL: FileText,
  GRADE: GraduationCap,
  ANNOUNCEMENT: Megaphone,
  INCIDENT: ShieldAlert,
  PAYMENT: CreditCard,
  MEETING: CalendarClock,
};
const TONE: Record<TimelineItem['tone'], string> = {
  info: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  danger: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
};

function dayHeading(iso: string): string {
  const day = new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const today = getPeruToday();
  const y = new Date(`${today}T12:00:00Z`);
  y.setUTCDate(y.getUTCDate() - 1);
  if (day === today) return 'Hoy';
  if (day === y.toISOString().slice(0, 10)) return 'Ayer';
  const label = formatPeruDate(iso, { weekday: 'long', day: 'numeric', month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const Row: React.FC<{ item: TimelineItem; showDate?: boolean }> = ({ item, showDate }) => {
  const Icon = KIND_ICON[item.kind] ?? FileText;
  const body = (
    <div className="flex gap-3">
      <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', TONE[item.tone])}>
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 border-b border-border/60 pb-3">
        <p className="text-sm font-medium text-foreground">{item.title}</p>
        {item.detail && <p className="text-xs text-muted-foreground">{item.detail}</p>}
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {showDate ? formatPeruDate(item.at, { weekday: 'short', day: 'numeric', month: 'short' }) : formatPeruTime(item.at)}
        </p>
      </div>
    </div>
  );
  return <li>{item.link ? <Link to={item.link} className="block rounded-lg hover:bg-muted/40">{body}</Link> : body}</li>;
};

/** Línea de tiempo del hijo: lo que pasó y lo que viene, como un feed. */
export const FamilyTimeline: React.FC<{ studentId: string | null; title?: string }> = ({ studentId, title = 'Lo último de tu hijo(a)' }) => {
  const [days, setDays] = useState(7);
  const { data, isLoading } = useFamilyTimeline(studentId, days);
  if (!studentId) return null;

  const groups: Array<{ day: string; items: TimelineItem[] }> = [];
  for (const it of data?.past ?? []) {
    const d = dayHeading(it.at);
    if (!groups.length || groups[groups.length - 1].day !== d) groups.push({ day: d, items: [] });
    groups[groups.length - 1].items.push(it);
  }

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <div className="space-y-4">
          {(data?.upcoming.length ?? 0) > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Próximamente</p>
              <ul className="space-y-2">{data!.upcoming.slice(0, 5).map((it) => <Row key={it.id} item={it} showDate />)}</ul>
            </div>
          )}
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin novedades en los últimos {days} días.</p>
          ) : (
            groups.map((g) => (
              <div key={g.day}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.day}</p>
                <ul className="space-y-2">{g.items.map((it) => <Row key={it.id} item={it} />)}</ul>
              </div>
            ))
          )}
          {days < 30 && (
            <button type="button" onClick={() => setDays(days === 7 ? 14 : 30)} className="text-xs font-medium text-primary hover:underline">
              Ver más días
            </button>
          )}
        </div>
      )}
    </Card>
  );
};
