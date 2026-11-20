import React from 'react';
import {
  School,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Classroom } from '@/features/classrooms/types';
import { navigateMonth } from './downloadAttendanceExcel';

interface MonthlyReportHeaderProps {
  classroomId: string;
  month: string;
  classrooms: Classroom[];
  isExporting: boolean;
  canExport: boolean;
  onClassroomChange: (id: string) => void;
  onMonthChange: (month: string) => void;
  onExport: () => void;
}

export const MonthlyReportHeader: React.FC<MonthlyReportHeaderProps> = ({
  classroomId,
  month,
  classrooms,
  isExporting,
  canExport,
  onClassroomChange,
  onMonthChange,
  onExport,
}) => {
  return (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
      <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
        {/* Selector de Aula */}
        <div className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-lg border border-input text-xs font-semibold">
          <School className="w-4 h-4 text-muted-foreground" />
          <select
            value={classroomId}
            onChange={(e) => onClassroomChange(e.target.value)}
            className="bg-transparent border-none focus:outline-none text-foreground font-semibold cursor-pointer"
          >
            <option value="">— Selecciona un Aula / Sección —</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.grade}° {c.section} (
                {c.educationLevel === 'PRIMARY'
                  ? 'Primaria'
                  : c.educationLevel === 'SECONDARY'
                    ? 'Secundaria'
                    : 'Inicial'}
                )
              </option>
            ))}
          </select>
        </div>

        {/* Navegación por Mes (Anterior / Siguiente) */}
        <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-input text-xs font-semibold">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            title="Mes Anterior"
            onClick={() => onMonthChange(navigateMonth(month, -1))}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>

          <div className="flex items-center gap-1 px-1">
            <CalendarIcon className="w-3.5 h-3.5 text-primary" />
            <Input
              type="month"
              value={month}
              onChange={(e) => onMonthChange(e.target.value)}
              className="h-6 border-none bg-transparent text-xs font-bold focus-visible:ring-0 w-32 p-0 cursor-pointer"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            title="Mes Siguiente"
            onClick={() => onMonthChange(navigateMonth(month, 1))}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Botón Exportar Acta Resumen (.xlsx) */}
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-xs font-bold w-full lg:w-auto"
        onClick={onExport}
        disabled={!classroomId || isExporting || !canExport}
      >
        {isExporting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
        )}
        <span>{isExporting ? 'Generando...' : 'Exportar Acta Resumen (.xlsx)'}</span>
      </Button>
    </div>
  );
};
