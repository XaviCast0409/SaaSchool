import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/axios';

interface StaffLoad {
  year: number;
  withLoad: number;
  withoutLoad: number;
  rows: Array<{
    teacher: { id: string; firstName: string; lastNamePaternal: string; lastNameMaternal: string | null; email: string | null };
    courses: number;
    classrooms: number;
    tutorOf: { educationLevel: string; grade: number; section: string } | null;
    hasLoad: boolean;
  }>;
}

const LEVEL: Record<string, string> = { INITIAL: 'Inicial', PRIMARY: 'Primaria', SECONDARY: 'Secundaria' };
const room = (c: { educationLevel: string; grade: number; section: string }) =>
  c.educationLevel === 'INITIAL' ? `${c.grade} años "${c.section}"` : `${c.grade}.° ${LEVEL[c.educationLevel]} "${c.section}"`;

/** Docentes del año que se está viendo: cursos asignados y tutoría en ese año. */
export const StaffLoadPanel: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'with' | 'without'>('all');
  const { data, isLoading } = useQuery({
    queryKey: ['staff-load'],
    queryFn: async () => (await api.get<{ data: StaffLoad }>('/users/staff-load')).data.data,
  });
  if (isLoading || !data) {
    return (
      <div className="p-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin text-primary" /> Cargando docentes...
      </div>
    );
  }
  const rows = data.rows.filter((r) => (filter === 'all' ? true : filter === 'with' ? r.hasLoad : !r.hasLoad));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {(
          [
            ['all', `Todos (${data.rows.length})`],
            ['with', `Con carga en ${data.year} (${data.withLoad})`],
            ['without', `Sin carga en ${data.year} (${data.withoutLoad})`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`rounded-full px-3 py-1 font-semibold ${filter === k ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 border-b border-border text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
            <tr>
              <th className="px-4 py-3">Docente</th>
              <th className="px-4 py-3 text-right">Cursos {data.year}</th>
              <th className="px-4 py-3 text-right">Aulas</th>
              <th className="px-4 py-3">Tutor(a) de</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((r) => (
              <tr key={r.teacher.id} className={r.hasLoad ? '' : 'text-muted-foreground'}>
                <td className="px-4 py-3">
                  <div className="font-bold text-foreground">
                    {r.teacher.lastNamePaternal} {r.teacher.lastNameMaternal ?? ''}, {r.teacher.firstName}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{r.teacher.email}</div>
                </td>
                <td className="px-4 py-3 text-right font-mono">{r.courses || '—'}</td>
                <td className="px-4 py-3 text-right font-mono">{r.classrooms || '—'}</td>
                <td className="px-4 py-3">
                  {r.tutorOf ? room(r.tutorOf) : !r.hasLoad ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">Sin carga</span> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">
        La carga se arma en Académico → Carga docente y la tutoría en Aulas, para el año elegido en la cabecera.
      </p>
    </div>
  );
};
