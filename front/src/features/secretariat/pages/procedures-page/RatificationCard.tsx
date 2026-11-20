import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPeruShortDate, formatPeruDateTime } from '@/lib/dateUtils';

interface RatificationCardProps {
  ratification: {
    open: boolean;
    year: number | null;
    deadline?: string | null;
  };
  childrenList: Array<{
    studentId: string;
    name: string;
    ratification: {
      decision: 'CONFIRMED' | 'DECLINED';
      updatedAt: string;
    } | null;
  }>;
  isPending: boolean;
  onConfirm: (studentId: string, decision: 'CONFIRMED' | 'DECLINED') => void;
  onOpenDecline: (student: { studentId: string; name: string }) => void;
}

export const RatificationCard: React.FC<RatificationCardProps> = ({
  ratification,
  childrenList,
  isPending,
  onConfirm,
  onOpenDecline,
}) => {
  if (!ratification.open || !ratification.year) return null;

  return (
    <Card className="space-y-3 p-4">
      <div>
        <p className="font-semibold">Ratificación de matrícula {ratification.year}</p>
        <p className="text-sm text-muted-foreground">
          Confirme si su hijo(a) continuará en el colegio el próximo año
          {ratification.deadline ? `, a más tardar el ${formatPeruShortDate(ratification.deadline.slice(0, 10))}` : ''}.
        </p>
      </div>
      <div className="space-y-2">
        {childrenList.map((c) => (
          <div key={c.studentId} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
            <p className="min-w-0 flex-1 font-medium">{c.name}</p>
            {c.ratification ? (
              <div className="flex items-center gap-3">
                {c.ratification.decision === 'CONFIRMED' ? (
                  <span className="flex items-center gap-1 text-sm text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" aria-hidden /> Continúa en {ratification.year}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sm text-red-700 dark:text-red-400">
                    <XCircle className="h-4 w-4" aria-hidden /> No continuará
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatPeruDateTime(c.ratification.updatedAt)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    c.ratification!.decision === 'CONFIRMED'
                      ? onOpenDecline({ studentId: c.studentId, name: c.name })
                      : onConfirm(c.studentId, 'CONFIRMED')
                  }
                  disabled={isPending}
                >
                  Cambiar
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenDecline({ studentId: c.studentId, name: c.name })}
                  disabled={isPending}
                >
                  No continuará
                </Button>
                <Button size="sm" onClick={() => onConfirm(c.studentId, 'CONFIRMED')} disabled={isPending}>
                  Sí, continúa en {ratification.year}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
