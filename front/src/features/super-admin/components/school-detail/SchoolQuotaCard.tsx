import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPeruDateTime } from '@/lib/dateUtils';
import { SchoolWithStats } from '../../types';
import { Row } from '../ui-bits';

interface SchoolQuotaCardProps {
  school: SchoolWithStats;
  quota: number | null | undefined;
  students: number;
  pct: number | null;
}

export const SchoolQuotaCard: React.FC<SchoolQuotaCardProps> = ({ school, quota, students, pct }) => {
  const quotaLabel = quota === null ? '∞' : (quota ?? '—');
  const barColor = pct !== null && pct >= 100 ? 'bg-destructive' : pct !== null && pct >= 90 ? 'bg-amber-500' : 'bg-primary';

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Uso</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Row label="Alumnos">
          {students}
          <span className="text-muted-foreground"> / {quotaLabel}</span>
          {pct !== null && <span className="text-xs text-muted-foreground"> ({pct}%)</span>}
        </Row>
        {pct !== null && (
          <div
            className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
            role="meter"
            aria-label="Uso del cupo"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        )}
        <Row label="Usuarios">{school._count?.users ?? 0}</Row>
        <Row label="Última actividad">
          {school.activity?.lastSeenAt ? formatPeruDateTime(school.activity.lastSeenAt) : 'Sin actividad'}
        </Row>
        <Row label="Cuentas activas">
          {school.activity?.active7d ?? 0} en 7 d · {school.activity?.active30d ?? 0} en 30 d
        </Row>
      </CardContent>
    </Card>
  );
};
