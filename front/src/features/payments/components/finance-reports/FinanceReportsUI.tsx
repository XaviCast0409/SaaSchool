import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/format';
import type { GroupRow } from '../../api/useFinance';
import { sel } from './constants';

export const ExcelButton: React.FC<{ onClick: () => void; disabled?: boolean }> = ({ onClick, disabled }) => (
  <Button variant="outline" size="sm" className="gap-1.5" onClick={onClick} disabled={disabled}>
    <Download className="h-3.5 w-3.5" /> Exportar a Excel
  </Button>
);

export const DateRange: React.FC<{ start: string; end: string; onChange: (s: string, e: string) => void }> = ({
  start,
  end,
  onChange,
}) => (
  <>
    <label className="space-y-1 text-xs font-semibold text-muted-foreground">
      Desde
      <input type="date" className={`${sel} block`} value={start} onChange={(e) => onChange(e.target.value, end)} />
    </label>
    <label className="space-y-1 text-xs font-semibold text-muted-foreground">
      Hasta
      <input type="date" className={`${sel} block`} value={end} onChange={(e) => onChange(start, e.target.value)} />
    </label>
  </>
);

export const GroupTable: React.FC<{ title: string; rows: GroupRow[]; label?: (k: string) => string; total: number }> = ({
  title,
  rows,
  label,
  total,
}) => (
  <div className="rounded-lg border border-border">
    <p className="border-b border-border bg-muted/40 px-3 py-1.5 text-xs font-bold uppercase text-muted-foreground">
      {title}
    </p>
    <table className="w-full text-xs">
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-t border-border first:border-t-0">
            <td className="p-2">{label ? label(r.key) : r.key}</td>
            <td className="p-2 text-right text-muted-foreground">{r.count}</td>
            <td className="p-2 text-right font-semibold">{formatMoney(r.total)}</td>
            <td className="p-2 text-right text-muted-foreground">
              {total ? `${((r.total / total) * 100).toFixed(1)} %` : ''}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
