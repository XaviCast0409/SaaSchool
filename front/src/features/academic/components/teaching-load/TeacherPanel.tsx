import React, { useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { teacherName, type TeachingLoad } from '../../types';
import { Avatar } from './TeachingLoadUI';

interface TeacherPanelProps {
  data: TeachingLoad;
  loadByTeacher: Map<string, { courses: number; hours: number }>;
  focusTeacher: string | null;
  onFocus: (id: string | null) => void;
}

export const TeacherPanel: React.FC<TeacherPanelProps> = ({ data, loadByTeacher, focusTeacher, onFocus }) => {
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.teachers
      .map((t) => ({ t, load: loadByTeacher.get(t.id) ?? { courses: 0, hours: 0 } }))
      .filter(({ t }) => !term || teacherName(t).toLowerCase().includes(term))
      .sort((a, b) => b.load.hours - a.load.hours || b.load.courses - a.load.courses);
  }, [data.teachers, loadByTeacher, q]);
  const maxHours = Math.max(1, ...rows.map((r) => r.load.hours));

  return (
    <Card className="overflow-hidden lg:sticky lg:top-4">
      <div className="border-b border-border px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4 text-primary" /> Carga por docente
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">Toca un docente para resaltar sus cursos.</p>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar docente…"
            className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>
      <ul className="max-h-[60vh] space-y-0.5 overflow-y-auto p-2">
        {rows.map(({ t, load }) => {
          const active = focusTeacher === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onFocus(active ? null : t.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors',
                  active ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/60',
                )}
              >
                <Avatar teacher={t} className="h-7 w-7 text-xs" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={cn('truncate text-xs font-medium', !load.courses && 'text-muted-foreground')}>
                      {teacherName(t)}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{load.hours} h</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          load.courses ? 'bg-primary/70' : 'bg-transparent',
                        )}
                        style={{ width: `${(load.hours / maxHours) * 100}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {load.courses} curso{load.courses === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
        {rows.length === 0 && <li className="px-2 py-6 text-center text-xs text-muted-foreground">Sin resultados</li>}
      </ul>
    </Card>
  );
};
