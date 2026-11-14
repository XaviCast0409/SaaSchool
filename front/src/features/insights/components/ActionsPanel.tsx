import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useActions } from '../api/useInsights';

const DOT: Record<string, string> = { high: 'bg-rose-500', medium: 'bg-amber-400', low: 'bg-sky-400' };

/** Panel de la Dirección: qué hay que resolver hoy, con un clic a cada pantalla. */
export const ActionsPanel: React.FC = () => {
  const { data, isLoading } = useActions(true);
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary" aria-hidden />
        <h2 className="text-base font-semibold text-foreground">Para resolver hoy</h2>
        {data && data.length > 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{data.length}</span>}
      </div>
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : !data || data.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden /> Todo en orden: no hay pendientes urgentes.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {data.map((a) => (
            <li key={a.id}>
              <Link to={a.link} className="group flex items-start gap-3 rounded-lg px-1 py-2.5 hover:bg-muted/50">
                <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', DOT[a.severity])} aria-label={a.severity === 'high' ? 'Urgente' : a.severity === 'medium' ? 'Importante' : 'Informativo'} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {a.severity === 'high' && <AlertTriangle className="mr-1 inline h-3.5 w-3.5 align-text-top text-rose-500" aria-hidden />}
                    {a.title}
                    {!/^\S*S\/|^\d/.test(a.title) && <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-foreground">{a.count}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{a.detail}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
