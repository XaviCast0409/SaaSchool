import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { PlanStatus } from '@/features/schools/types';

/** Etiqueta del estado de vigencia del plan (gracia → solo lectura → sin acceso) */
export const PlanStatusBadge: React.FC<{ status?: PlanStatus }> = ({ status }) => {
  if (!status) return null;
  const { access, daysUntilExpiry, daysOverdue } = status;
  if (access === 'ACTIVE') {
    if (daysUntilExpiry === null || daysUntilExpiry > 15) return null;
    return (
      <Badge
        variant="outline"
        className="text-xs whitespace-nowrap border-amber-500/40 text-amber-700 dark:text-amber-300"
      >
        {daysUntilExpiry === 0 ? 'Vence hoy' : `Vence en ${daysUntilExpiry} d`}
      </Badge>
    );
  }
  const label =
    access === 'GRACE'
      ? `En gracia · ${daysOverdue} d vencido`
      : access === 'READ_ONLY'
        ? `Solo lectura · ${daysOverdue} d vencido`
        : `Sin acceso · ${daysOverdue} d vencido`;
  return (
    <Badge variant={access === 'GRACE' ? 'outline' : 'destructive'} className="text-xs whitespace-nowrap">
      {label}
    </Badge>
  );
};
