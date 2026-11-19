import React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/format';
import {
  feeSummary,
  LEVEL_LABEL,
  MONTH_SHORT,
  type EducationLevel,
  type FeeSchedule,
} from '../../api/useFeeSchedules';
import { scopeLabel } from '../../constants';

export interface FeeScheduleQuotaTableProps {
  level: EducationLevel;
  rows: FeeSchedule[];
  canManage: boolean;
  onEdit: (r: FeeSchedule) => void;
  onDelete: (r: FeeSchedule) => void;
  onAdd: () => void;
}

export const FeeScheduleQuotaTable: React.FC<FeeScheduleQuotaTableProps> = ({
  level,
  rows,
  canManage,
  onEdit,
  onDelete,
  onAdd,
}) => {
  const hasLevelWide = rows.some((r) => r.grade === null);

  return (
    <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-black text-foreground">{LEVEL_LABEL[level]}</h2>
          {rows.length === 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400">
              Sin tarifario: las matrículas no generarán cuotas
            </span>
          ) : !hasLevelWide ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-secondary text-secondary-foreground">
              Solo algunos grados
            </span>
          ) : null}
        </div>
        {canManage && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs font-bold text-primary gap-1"
            onClick={onAdd}
          >
            <Plus className="w-3 h-3" /> Agregar
          </Button>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-xs text-muted-foreground text-center">
          {canManage
            ? 'Agrega el tarifario de este nivel para generar cuotas al matricular.'
            : 'Aún no se configuró.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-xs font-extrabold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
              <tr>
                <th className="px-4 py-3">Aplica a</th>
                <th className="px-4 py-3 text-right">Matrícula</th>
                <th className="px-4 py-3 text-right">Pensión</th>
                <th className="px-4 py-3 text-right">Cuota de ingreso</th>
                <th className="px-4 py-3">Meses</th>
                <th className="px-4 py-3">Vence</th>
                <th className="px-4 py-3 text-right">Total anual</th>
                {canManage && <th className="px-4 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((r) => {
                const sum = feeSummary(r);
                return (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-bold text-foreground whitespace-nowrap">{scopeLabel(r)}</td>
                    <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                      {formatMoney(r.enrollmentFee)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-foreground whitespace-nowrap">
                      {formatMoney(r.monthlyFee)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono whitespace-nowrap text-muted-foreground">
                      {r.admissionFee > 0 ? formatMoney(r.admissionFee) : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-secondary text-secondary-foreground">
                        {MONTH_SHORT[r.firstMonth - 1]}–{MONTH_SHORT[r.lastMonth - 1]} · {sum.months} cuotas
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {r.dueDay === 31 ? 'Último día del mes' : `Día ${r.dueDay}`}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-foreground whitespace-nowrap">
                      {formatMoney(sum.annual)}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            aria-label="Editar"
                            onClick={() => onEdit(r)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            aria-label="Eliminar"
                            onClick={() => onDelete(r)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
