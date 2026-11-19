import React, { useMemo, useState } from 'react';
import { CheckCircle2, FileEdit } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatPeruShortDate } from '@/lib/dateUtils';
import { INTERVENTION_LABEL, useRisk, type RiskRow } from '../../api/useInsights';
import { LEVEL_STYLE } from './constants';
import { TutoringModal } from './TutoringModal';

const dateOnly = (iso: string) => formatPeruShortDate(iso.slice(0, 10));

export const RiskTab: React.FC = () => {
  const [classroomId, setClassroomId] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('');
  const { data, isLoading } = useRisk(classroomId || null, true);
  const [open, setOpen] = useState<RiskRow | null>(null);
  const classrooms = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of data?.rows ?? []) map.set(r.classroomId, r.classroom);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [data]);
  const rows = (data?.rows ?? []).filter((r) => !levelFilter || r.level === levelFilter);
  const counts = { ALTO: 0, MEDIO: 0, BAJO: 0 } as Record<string, number>;
  for (const r of data?.rows ?? []) counts[r.level]++;

  return (
    <div className="space-y-3">
      <Card className="p-4 text-sm text-muted-foreground">
        Índice que combina, del <strong className="text-foreground">{data?.periodLabel ?? 'periodo actual'}</strong> y
        los últimos 30 días: competencias en C, competencias que bajaron de nivel, faltas sin justificar, tareas
        vencidas sin entregar, incidencias y tardanzas. <strong className="text-foreground">No usa pagos.</strong> Es
        una ayuda para priorizar, no un diagnóstico.
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        {(['ALTO', 'MEDIO', 'BAJO'] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLevelFilter(levelFilter === l ? '' : l)}
            aria-pressed={levelFilter === l}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold',
              LEVEL_STYLE[l],
              levelFilter === l && 'ring-2 ring-primary',
            )}
          >
            Riesgo {l.toLowerCase()}: {counts[l]}
          </button>
        ))}
        {classrooms.length > 1 && (
          <select
            className="ml-auto h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={classroomId}
            onChange={(e) => setClassroomId(e.target.value)}
            aria-label="Filtrar por aula"
          >
            <option value="">Todas las aulas</option>
            {classrooms.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : rows.length === 0 ? (
        <Card className="flex items-center gap-2 p-4 text-sm text-foreground">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden /> Ningún estudiante con señales de riesgo en
          este filtro.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.enrollmentId} className="flex flex-wrap items-start gap-3 p-3">
                <span
                  className={cn(
                    'mt-0.5 w-16 shrink-0 rounded-md px-2 py-1 text-center text-xs font-bold',
                    LEVEL_STYLE[r.level],
                  )}
                >
                  {r.level}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {r.name} <span className="text-xs font-normal text-muted-foreground">· {r.classroom}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{r.reasons.join(' · ') || 'Señales leves'}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.lastIntervention
                      ? `Última intervención: ${INTERVENTION_LABEL[r.lastIntervention.type] ?? r.lastIntervention.type} · ${dateOnly(r.lastIntervention.date)}`
                      : 'Sin intervenciones registradas'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={r.lastIntervention ? 'outline' : 'default'}
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => setOpen(r)}
                >
                  <FileEdit className="h-3.5 w-3.5" aria-hidden /> Plan de tutoría
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <TutoringModal row={open} onClose={() => setOpen(null)} />
    </div>
  );
};
