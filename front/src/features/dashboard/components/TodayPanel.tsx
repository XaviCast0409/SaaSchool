import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, CalendarDays, CalendarOff, School, ShieldAlert } from 'lucide-react';
import { getPeruToday } from '@/lib/dateUtils';
import { useAttendance } from '@/features/attendance/api/useAttendance';
import { useGateToday } from '@/features/family/api/useFamily';
import { useCalendar } from '@/features/calendar/api/useCalendar';
import { useIncidents } from '@/features/incidents/api/useIncidents';

interface TileProps {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  label: string;
  value: React.ReactNode;
  detail: string;
}

/** Un número de «Hoy» que lleva a la pantalla donde se resuelve */
const Tile: React.FC<TileProps> = ({ to, icon: Icon, tone, label, value, detail }) => (
  <Link
    to={to}
    className="group flex flex-col gap-1 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
      <Icon className={`h-4 w-4 ${tone}`} aria-hidden />
    </span>
    <span className="text-2xl font-extrabold text-foreground">{value}</span>
    <span className="line-clamp-2 text-xs text-muted-foreground" title={detail}>
      {detail}
    </span>
  </Link>
);

/**
 * Lo que pasa hoy en el colegio, en números que se pueden tocar: asistencia, quién sigue en el colegio,
 * eventos del calendario e incidencias registradas. Para Dirección y Secretaría.
 */
export const TodayPanel: React.FC = () => {
  const today = getPeruToday();
  // Lima es UTC-5: el día empieza a las 05:00 UTC
  const todayStartIso = `${today}T00:00:00-05:00`;

  const { data: attendance } = useAttendance({ date: today, page: 1, limit: 1 });
  const { data: gate } = useGateToday();
  const { data: calendarItems = [] } = useCalendar(today, today);
  const { data: incidents } = useIncidents({ page: 1, limit: 1, startDate: todayStartIso });

  const stats = attendance?.stats;
  const attended = (stats?.present ?? 0) + (stats?.late ?? 0);
  const events = calendarItems.filter((i) => i.kind !== 'HOLIDAY');
  const incidentsToday = incidents?.meta?.total ?? 0;
  const noClasses = gate && !gate.isSchoolDay;

  return (
    <section aria-labelledby="today-title" className="space-y-3">
      <h2 id="today-title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Hoy
      </h2>

      {noClasses && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-foreground">
          <CalendarOff className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <span>
            <strong>Hoy no hay clases.</strong> {gate?.nonSchoolDayReason}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          to="/attendance"
          icon={CalendarCheck}
          tone="text-emerald-600 dark:text-emerald-400"
          label="Asistencia"
          value={
            <>
              {attended}
              <span className="text-sm font-semibold text-muted-foreground"> / {stats?.total ?? 0}</span>
            </>
          }
          detail={
            stats?.total
              ? `${stats.late} tardanza(s) · ${stats.absent} falta(s)`
              : noClasses
                ? 'Sin clases hoy'
                : 'Aún no hay marcaciones'
          }
        />
        <Tile
          to="/gate"
          icon={School}
          tone="text-amber-600 dark:text-amber-400"
          label="Aún en el colegio"
          value={gate?.stillInSchool ?? 0}
          detail={`${gate?.checkedOut ?? 0} salida(s) registrada(s)`}
        />
        <Tile
          to="/calendar"
          icon={CalendarDays}
          tone="text-primary"
          label="Eventos"
          value={events.length}
          detail={events.length ? events.map((e) => e.title).join(' · ') : 'Nada programado para hoy'}
        />
        <Tile
          to="/incidents"
          icon={ShieldAlert}
          tone="text-rose-600 dark:text-rose-400"
          label="Incidencias"
          value={incidentsToday}
          detail={incidentsToday ? 'Registradas hoy' : 'Ninguna registrada hoy'}
        />
      </div>
    </section>
  );
};
