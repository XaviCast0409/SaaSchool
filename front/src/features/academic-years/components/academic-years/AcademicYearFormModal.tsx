import React from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AcademicYear, PeriodDateConfig } from '../../api/useAcademicYears';
import { getDefaultPeriods, withYear } from '../../utils/academicYearDates';
import { PeriodsConfigTable } from './PeriodsConfigTable';

export interface AcademicYearFormData {
  year: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  periodType: 'BIMESTER' | 'TRIMESTER';
  annualCalculationMode: 'LAST_PERIOD' | 'AVERAGE';
  periodsConfig: PeriodDateConfig[];
}

export interface AcademicYearFormModalProps {
  isOpen: boolean;
  editingYear: AcademicYear | null;
  formData: AcademicYearFormData;
  isLoading: boolean;
  onClose: () => void;
  onChange: (data: AcademicYearFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const AcademicYearFormControls: React.FC<{
  formData: AcademicYearFormData;
  onChange: (data: AcademicYearFormData) => void;
}> = ({ formData, onChange }) => {
  return (
    <>
      <div>
        <label
          htmlFor="academicyearspage-field-1"
          className="block text-xs font-bold text-muted-foreground uppercase mb-1"
        >
          Número de Año (Ej: 2026) *
        </label>
        <input
          id="academicyearspage-field-1"
          type="number"
          required
          min={2000}
          max={2100}
          value={formData.year}
          onChange={(e) => onChange(withYear(formData, Number(e.target.value)))}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label
          htmlFor="academicyearspage-field-2"
          className="block text-xs font-bold text-muted-foreground uppercase mb-1"
        >
          Nombre del Año Lectivo *
        </label>
        <input
          id="academicyearspage-field-2"
          type="text"
          required
          placeholder='Ej: "Año Escolar 2026"'
          value={formData.name}
          onChange={(e) => onChange({ ...formData, name: e.target.value })}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="academicyearspage-field-3"
            className="block text-xs font-bold text-muted-foreground uppercase mb-1"
          >
            Fecha Inicio *
          </label>
          <input
            id="academicyearspage-field-3"
            type="date"
            required
            value={formData.startDate}
            onChange={(e) => onChange({ ...formData, startDate: e.target.value })}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label
            htmlFor="academicyearspage-field-4"
            className="block text-xs font-bold text-muted-foreground uppercase mb-1"
          >
            Fecha Término *
          </label>
          <input
            id="academicyearspage-field-4"
            type="date"
            required
            value={formData.endDate}
            onChange={(e) => onChange({ ...formData, endDate: e.target.value })}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="academicyearspage-field-5"
            className="block text-xs font-bold text-muted-foreground uppercase mb-1"
          >
            Régimen de Periodos
          </label>
          <select
            id="academicyearspage-field-5"
            value={formData.periodType}
            onChange={(e) => {
              const newType = e.target.value as 'BIMESTER' | 'TRIMESTER';
              onChange({
                ...formData,
                periodType: newType,
                periodsConfig: getDefaultPeriods(newType, formData.year),
              });
            }}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="BIMESTER">Bimestral (4 Periodos)</option>
            <option value="TRIMESTER">Trimestral (3 Periodos)</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="academicyearspage-field-6"
            className="block text-xs font-bold text-muted-foreground uppercase mb-1"
          >
            Cálculo Anual SIAGIE
          </label>
          <select
            id="academicyearspage-field-6"
            value={formData.annualCalculationMode}
            onChange={(e) =>
              onChange({
                ...formData,
                annualCalculationMode: e.target.value as 'LAST_PERIOD' | 'AVERAGE',
              })
            }
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="LAST_PERIOD">Último Periodo Conclusivo (RVM 094)</option>
            <option value="AVERAGE">Promedio Anual Ponderado</option>
          </select>
        </div>
      </div>
    </>
  );
};

export const AcademicYearFormModal: React.FC<AcademicYearFormModalProps> = ({
  isOpen,
  editingYear,
  formData,
  isLoading,
  onClose,
  onChange,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <span>{editingYear ? 'Editar Año Lectivo' : 'Nuevo Año Lectivo'}</span>
        </h2>

        <form onSubmit={onSubmit} className="space-y-4">
          <AcademicYearFormControls formData={formData} onChange={onChange} />

          <PeriodsConfigTable
            periodType={formData.periodType}
            periodsConfig={formData.periodsConfig}
            onChange={(updated) => onChange({ ...formData, periodsConfig: updated })}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" isLoading={isLoading} className="gap-2 font-bold">
              <span>Guardar Año Lectivo</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
