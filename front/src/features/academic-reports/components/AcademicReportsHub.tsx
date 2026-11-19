import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { ReportCode, EducationLevel, ReportClassroomItem } from '../types';
import { ALL_REPORTS_CATALOG, type ReportItemDefinition } from '../constants/reportsCatalog';
import { ReportCatalogTree } from './academic-reports-hub/ReportCatalogTree';
import { ReportParametersPanel } from './academic-reports-hub/ReportParametersPanel';

export { ALL_REPORTS_CATALOG, type ReportItemDefinition };

export interface AcademicReportsHubProps {
  selectedReportCode: string;
  onSelectReportCode: (code: ReportCode) => void;
  classrooms: ReportClassroomItem[];
  selectedLevel: EducationLevel;
  onSelectLevel: (level: EducationLevel) => void;
  selectedGrade: number;
  onSelectGrade: (grade: number) => void;
  selectedClassroomId: string;
  onSelectClassroom: (classroomId: string) => void;
  selectedPeriod: number;
  onSelectPeriod: (period: number) => void;
  selectedMonth?: number;
  onSelectMonth?: (month: number) => void;
  selectedState?: string;
  onSelectState?: (state: string) => void;
  pdfOrientation: 'Horizontal' | 'Vertical';
  onSelectPdfOrientation: (orientation: 'Horizontal' | 'Vertical') => void;
  onGeneratePdf: () => void;
  onGenerateExcel: () => void;
  isGeneratingPdf: boolean;
  isGeneratingExcel: boolean;
}

export const AcademicReportsHub: React.FC<AcademicReportsHubProps> = ({
  selectedReportCode,
  onSelectReportCode,
  classrooms,
  selectedLevel,
  onSelectLevel,
  selectedGrade,
  onSelectGrade,
  selectedClassroomId,
  onSelectClassroom,
  selectedPeriod,
  onSelectPeriod,
  selectedMonth = 0,
  onSelectMonth,
  selectedState = 'REGISTERED',
  onSelectState,
  pdfOrientation,
  onSelectPdfOrientation,
  onGeneratePdf,
  onGenerateExcel,
  isGeneratingPdf,
  isGeneratingExcel,
}) => {
  const activeReport = useMemo(() => {
    return (
      ALL_REPORTS_CATALOG.find((r) => r.code === selectedReportCode) || ALL_REPORTS_CATALOG[4]
    );
  }, [selectedReportCode]);

  return (
    <div className="space-y-4">
      {/* Barra Superior con Contador de Reportes */}
      <div className="bg-card border border-border rounded-xl px-4 py-2.5 shadow-sm flex items-center justify-between">
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">
          Catálogo Institucional de Reportes
        </span>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase">Total Reportes:</span>
          <Badge variant="secondary" className="font-mono text-xs font-bold px-2.5 py-0.5">
            {ALL_REPORTS_CATALOG.length}
          </Badge>
        </div>
      </div>

      {/* Grid Principal Dividido: Izquierda (Catálogo) / Derecha (Parámetros y Descarga) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <ReportCatalogTree
          selectedReportCode={selectedReportCode}
          onSelectReportCode={onSelectReportCode}
        />
        <ReportParametersPanel
          activeReport={activeReport}
          selectedReportCode={selectedReportCode}
          classrooms={classrooms}
          selectedLevel={selectedLevel}
          onSelectLevel={onSelectLevel}
          selectedGrade={selectedGrade}
          onSelectGrade={onSelectGrade}
          selectedClassroomId={selectedClassroomId}
          onSelectClassroom={onSelectClassroom}
          selectedPeriod={selectedPeriod}
          onSelectPeriod={onSelectPeriod}
          selectedMonth={selectedMonth}
          onSelectMonth={onSelectMonth}
          selectedState={selectedState}
          onSelectState={onSelectState}
          pdfOrientation={pdfOrientation}
          onSelectPdfOrientation={onSelectPdfOrientation}
          onGeneratePdf={onGeneratePdf}
          onGenerateExcel={onGenerateExcel}
          isGeneratingPdf={isGeneratingPdf}
          isGeneratingExcel={isGeneratingExcel}
        />
      </div>
    </div>
  );
};
