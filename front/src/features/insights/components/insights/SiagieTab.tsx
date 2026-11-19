import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useSiagieData } from '../../api/useInsights';

export const SiagieTab: React.FC = () => {
  const { data, isLoading } = useSiagieData(true);
  const [q, setQ] = useState('');
  if (isLoading || !data) return <Skeleton className="h-48 w-full rounded-xl" />;
  const rows = data.rows.filter((r) => !q || `${r.name} ${r.classroom}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-3">
      {data.rows.length === 0 ? (
        <Card className="flex items-center gap-2 p-4 text-sm text-foreground">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden /> Todos los estudiantes matriculados tienen
          los datos que pide el SIAGIE.
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.totals).map(([k, v]) => (
              <span
                key={k}
                className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-200"
              >
                {k}: <strong>{v}</strong>
              </span>
            ))}
          </div>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar estudiante o aula"
            className="h-9 max-w-xs"
            aria-label="Buscar"
          />
          <Card className="overflow-hidden">
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.studentId} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {r.name} <span className="text-xs font-normal text-muted-foreground">· {r.classroom}</span>
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">{r.issues.join(' · ')}</p>
                  </div>
                  <Link
                    to={`/students?q=${encodeURIComponent(r.name)}`}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Corregir ficha
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <p className="text-xs text-muted-foreground">
            Corrígelos antes de exportar las actas o la nómina: «Corregir ficha» abre al alumno en Alumnos y matrícula.
          </p>
        </>
      )}
    </div>
  );
};
