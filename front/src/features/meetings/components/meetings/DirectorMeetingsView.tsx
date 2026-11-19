import React from 'react';
import { formatPeruDateTime } from '@/lib/dateUtils';
import { MODE_LABEL, useMeetingsOverview } from '../../api/useMeetings';

/** Vista de la Dirección: quién atiende a las familias y qué entrevistas vienen. */
export const DirectorMeetingsView: React.FC = () => {
  const { data, isLoading } = useMeetingsOverview(true);
  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  const rows = data?.byStaff ?? [];
  const withoutSlots = rows.filter((r) => r.published === 0);
  return (
    <div className="space-y-5">
      {withoutSlots.length > 0 && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          {withoutSlots.length} docente(s) no tienen horarios publicados en los próximos 30 días: las familias solo
          pueden pedirles horario.
        </p>
      )}
      <section className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Docente</th>
              <th className="px-3 py-2 text-center font-semibold">Horarios (30 días)</th>
              <th className="px-3 py-2 text-center font-semibold">Reservados</th>
              <th className="px-3 py-2 text-center font-semibold">Solicitudes sin atender</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-xs text-muted-foreground">
                  Aún no hay docentes registrados.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.staffId} className="border-t border-border">
                  <td className="px-3 py-2">{r.name}</td>
                  <td
                    className={`px-3 py-2 text-center ${r.published === 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}`}
                  >
                    {r.published}
                  </td>
                  <td className="px-3 py-2 text-center">{r.booked}</td>
                  <td
                    className={`px-3 py-2 text-center ${r.pendingRequests > 0 ? 'text-destructive font-semibold' : ''}`}
                  >
                    {r.pendingRequests}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-foreground">Próximas entrevistas reservadas</h2>
        {(data?.upcoming ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">No hay entrevistas reservadas en los próximos 30 días.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {(data?.upcoming ?? []).map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
                <span className="font-semibold text-foreground">{formatPeruDateTime(s.startsAt)}</span>
                <span>
                  {s.staff.firstName} {s.staff.lastNamePaternal}
                </span>
                <span className="text-muted-foreground">
                  {s.parent ? `${s.parent.firstName} ${s.parent.lastNamePaternal}` : '—'}
                  {s.student ? ` · ${s.student.name}` : ''}
                </span>
                <span className="text-muted-foreground">{MODE_LABEL[s.mode]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
