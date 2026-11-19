import React from 'react';
import type { PeriodDateConfig } from '../../api/useAcademicYears';

export interface PeriodsConfigTableProps {
  periodType: 'BIMESTER' | 'TRIMESTER';
  periodsConfig: PeriodDateConfig[];
  onChange: (periods: PeriodDateConfig[]) => void;
}

export const PeriodsConfigTable: React.FC<PeriodsConfigTableProps> = ({
  periodType,
  periodsConfig,
  onChange,
}) => {
  return (
    <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2.5">
      <p className="text-xs font-bold text-foreground">
        Calendario de {periodType === 'TRIMESTER' ? 'Trimestres' : 'Bimestres'} (Fechas Oficiales):
      </p>
      <div className="space-y-2">
        {periodsConfig.map((period, idx) => (
          <div key={period.periodNumber} className="grid grid-cols-5 gap-2 items-center">
            <span className="col-span-1 text-xs font-bold text-muted-foreground truncate">{period.name}</span>
            <div className="col-span-2">
              <input
                type="date"
                value={period.startDate}
                onChange={(e) => {
                  const updated = [...periodsConfig];
                  updated[idx] = { ...updated[idx], startDate: e.target.value };
                  onChange(updated);
                }}
                className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground"
                title="Fecha de Inicio del Periodo"
              />
            </div>
            <div className="col-span-2">
              <input
                type="date"
                value={period.endDate}
                onChange={(e) => {
                  const updated = [...periodsConfig];
                  updated[idx] = { ...updated[idx], endDate: e.target.value };
                  onChange(updated);
                }}
                className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground"
                title="Fecha de Fin del Periodo"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
