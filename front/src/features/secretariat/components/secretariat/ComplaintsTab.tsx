import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { formatPeruShortDate } from '@/lib/dateUtils';
import { useComplaints, type Complaint } from '../../api/useSecretariat';
import { ComplaintModal } from './ComplaintModal';

export const ComplaintsTab: React.FC<{ canRespond: boolean }> = ({ canRespond }) => {
  const { data, isLoading } = useComplaints();
  const [selected, setSelected] = useState<Complaint | null>(null);
  if (isLoading) return <Skeleton className="h-48" />;
  if (!data?.length)
    return (
      <EmptyState
        title="Sin reclamos registrados"
        description="Los reclamos y quejas del Libro de Reclamaciones virtual llegan aquí con su plazo legal de 15 días hábiles."
      />
    );
  return (
    <>
      <Card className="divide-y">
        {data.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelected(c)}
            className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted/40"
          >
            <span className="font-mono text-xs">{c.code}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {c.consumerName} · <span className="font-normal text-muted-foreground">{c.itemDescription}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {c.kind === 'RECLAMO' ? 'Reclamo' : 'Queja'} · {formatPeruShortDate(c.createdAt)}
              </p>
            </div>
            {c.status === 'ANSWERED' ? (
              <Badge variant="success">Respondido</Badge>
            ) : (
              <Badge
                variant={c.daysLeft! < 0 ? 'destructive' : c.daysLeft! <= 5 ? 'warning' : 'secondary'}
                className={cn(c.daysLeft! < 0 && 'animate-pulse')}
              >
                {c.daysLeft! < 0
                  ? `Vencido hace ${-c.daysLeft!} d`
                  : c.daysLeft === 0
                    ? 'Vence hoy'
                    : `Quedan ${c.daysLeft} d`}
              </Badge>
            )}
          </button>
        ))}
      </Card>
      <ComplaintModal c={selected} onClose={() => setSelected(null)} canRespond={canRespond} />
    </>
  );
};
