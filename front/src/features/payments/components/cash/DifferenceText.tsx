import React from 'react';
import { formatMoney } from '@/lib/format';

/** Texto y color de una diferencia de arqueo. */
export const DifferenceText: React.FC<{ value: number | null | undefined }> = ({ value }) => {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const v = Number(value);
  if (v === 0) return <span className="font-semibold text-emerald-600 dark:text-emerald-400">Cuadrada</span>;
  return (
    <span className="font-semibold text-destructive">
      {v > 0 ? 'Sobrante' : 'Faltante'} {formatMoney(Math.abs(v))}
    </span>
  );
};
