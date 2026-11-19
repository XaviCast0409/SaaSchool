import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useHeatmap } from '../../api/useInsights';
import { cellColor } from './constants';

export const HeatmapTab: React.FC = () => {
  const [period, setPeriod] = useState<number | null>(null);
  const [level, setLevel] = useState<string>('');
  const { data, isLoading } = useHeatmap(period, level || null, true);
  if (isLoading || !data) return <Skeleton className="h-64 w-full rounded-xl" />;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={data.periodNumber}
          onChange={(e) => setPeriod(Number(e.target.value))}
          aria-label="Periodo"
        >
          {data.periods.map((p) => (
            <option key={p.number} value={p.number}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          aria-label="Nivel"
        >
          <option value="">Todos los niveles</option>
          <option value="INITIAL">Inicial</option>
          <option value="PRIMARY">Primaria</option>
          <option value="SECONDARY">Secundaria</option>
        </select>
        {data.provisional && (
          <span className="text-xs text-amber-700 dark:text-amber-300">
            Periodo abierto: los calificativos aún pueden cambiar.
          </span>
        )}
      </div>
      {data.classrooms.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">
          Aún no hay calificativos registrados para este periodo.
        </Card>
      ) : (
        <Card className="overflow-x-auto p-3">
          <table className="text-xs">
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 bg-card px-2 py-1 text-left font-medium text-muted-foreground">
                  Aula
                </th>
                {data.areas.map((a) => (
                  <th
                    key={a}
                    scope="col"
                    className="min-w-[88px] px-1 py-1 text-center font-medium text-muted-foreground"
                  >
                    {a}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.classrooms.map((c) => (
                <tr key={c.id}>
                  <th
                    scope="row"
                    className="sticky left-0 whitespace-nowrap bg-card px-2 py-1 text-left font-medium text-foreground"
                  >
                    {c.label}
                  </th>
                  {data.areas.map((a) => {
                    const t = data.cells[`${c.id}|${a}`];
                    if (!t || !t.total)
                      return (
                        <td key={a} className="px-1 py-1">
                          <div className="rounded-md bg-muted/40 py-2 text-center text-muted-foreground">—</div>
                        </td>
                      );
                    const pctC = Math.round((t.C / t.total) * 100);
                    const pctB = Math.round((t.B / t.total) * 100);
                    return (
                      <td key={a} className="px-1 py-1">
                        <div
                          className={cn('rounded-md px-1 py-1.5 text-center', cellColor(pctC, pctB))}
                          title={`AD ${t.AD} · A ${t.A} · B ${t.B} · C ${t.C} (de ${t.total})`}
                        >
                          <span className="block font-bold">{pctC}% C</span>
                          <span className="block text-xs opacity-80">{pctB}% B</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">
            Porcentaje de calificativos de competencias en C y en B por aula y área. Pasa el cursor para ver el detalle.
          </p>
        </Card>
      )}
    </div>
  );
};
