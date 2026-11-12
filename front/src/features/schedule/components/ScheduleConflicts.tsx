import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useScheduleConflicts } from '../api/useScheduleGenerator';

/** Cruces de docentes en todo el colegio, calculados en el momento (incluye los guardados "de todos modos"). */
export const ScheduleConflicts: React.FC = () => {
  const { data, isLoading } = useScheduleConflicts(true);
  if (isLoading) return <Skeleton className="h-32 w-full rounded-xl" />;
  if (!data || data.length === 0) {
    return (
      <Card className="flex items-center gap-3 p-4 text-sm text-foreground">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden /> Ningún docente tiene dos clases a la misma hora.
      </Card>
    );
  }
  return (
    <Card className="p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden /> {data.length} cruce(s) de docentes
      </p>
      <ul className="divide-y divide-border text-sm">
        {data.map((c, i) => (
          <li key={i} className="py-2">
            <p className="font-medium text-foreground">
              {c.teacherName} · {c.day} {c.time}
            </p>
            <p className="text-xs text-muted-foreground">{c.detail}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
};
