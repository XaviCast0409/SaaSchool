import React from 'react';
import { BookOpenCheck, Download, FileSpreadsheet } from 'lucide-react';
import { ExcelGradesGrid } from '../components/ExcelGradesGrid';
import { Button } from '@/components/ui/button';
import { PlanGuard } from '@/components/ui/PlanGuard';

export const GradesPage: React.FC = () => {
  return (
    <PlanGuard minPlan="PRO">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BookOpenCheck className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Registro de Notas (Evaluación Formativa / SIAGIE)
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Ingreso de calificaciones estilo Excel con conversión automática a escala oficial AD / A / B / C.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2 text-xs">
              <Download className="w-4 h-4" />
              <span>Exportar Acta SIAGIE (Excel)</span>
            </Button>
            <Button className="gap-2 text-xs">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Generar Libreta PDF</span>
            </Button>
          </div>
        </div>

        {/* Grid */}
        <ExcelGradesGrid />
      </div>
    </PlanGuard>
  );
};
