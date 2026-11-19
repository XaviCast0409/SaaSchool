import React from 'react';
import { usePeriods } from '@/features/academic-years/api/useAcademicYears';
import { FileSpreadsheet, FileText, Loader2, SlidersHorizontal, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EducationLevel, ReportClassroomItem } from '../../types';
import { ReportItemDefinition } from '../../constants/reportsCatalog';
import { ReportSpecificParams } from './ReportSpecificParams';

interface ReportParametersPanelProps {
  activeReport: ReportItemDefinition;
  selectedReportCode: string;
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

export const ReportParametersPanel: React.FC<ReportParametersPanelProps> = ({
  activeReport,
  selectedReportCode,
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
  const { periods: yearPeriods, label: periodLabel } = usePeriods();

  return (
    <div className="lg:col-span-6 bg-card border border-border rounded-xl shadow-sm p-5 space-y-5">
      {/* Sección: Descripción */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-black text-muted-foreground uppercase tracking-wider mb-2">
          <Info className="w-3.5 h-3.5 text-primary" />
          <span>DESCRIPCIÓN:</span>
        </div>
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-foreground uppercase tracking-tight">{activeReport.name}</h3>
            <Badge variant="outline" className="font-mono text-xs font-bold border-primary/30 text-primary">
              {activeReport.code}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{activeReport.description}</p>
        </div>
      </div>

      {/* Sección: Parámetros */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-black text-muted-foreground uppercase tracking-wider">
          <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
          <span>PARÁMETROS:</span>
        </div>

        <div className="space-y-2.5 text-xs">
          {/* Año Lectivo */}
          <div className="grid grid-cols-12 items-center gap-2">
            <label className="col-span-4 font-bold text-muted-foreground text-right">Año:</label>
            <div className="col-span-8">
              <select className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground focus:ring-1 focus:ring-primary outline-none">
                <option>{new Date().getFullYear()}</option>
              </select>
            </div>
          </div>

          <ReportSpecificParams
            selectedReportCode={selectedReportCode}
            classrooms={classrooms}
            selectedLevel={selectedLevel}
            onSelectLevel={onSelectLevel}
            selectedGrade={selectedGrade}
            onSelectGrade={onSelectGrade}
            selectedClassroomId={selectedClassroomId}
            onSelectClassroom={onSelectClassroom}
            selectedMonth={selectedMonth}
            onSelectMonth={onSelectMonth}
            selectedState={selectedState}
            onSelectState={onSelectState}
          />

          {/* Periodo Bimestral */}
          {['0021', '0048', '0049', '0030'].includes(selectedReportCode) && (
            <div className="grid grid-cols-12 items-center gap-2">
              <label className="col-span-4 font-bold text-muted-foreground text-right">Periodo:</label>
              <div className="col-span-8">
                <select
                  value={selectedPeriod}
                  onChange={(e) => onSelectPeriod(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground focus:ring-1 focus:ring-primary outline-none"
                >
                  {yearPeriods.map((p) => (
                    <option key={p} value={p}>
                      {p}° {periodLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Orientación PDF */}
          <div className="grid grid-cols-12 items-center gap-2">
            <label className="col-span-4 font-bold text-muted-foreground text-right">Orientacion Pdf:</label>
            <div className="col-span-8">
              <select
                value={pdfOrientation}
                onChange={(e) => onSelectPdfOrientation(e.target.value as 'Horizontal' | 'Vertical')}
                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="Horizontal">Horizontal (Landscape)</option>
                <option value="Vertical">Vertical (Portrait)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Botones de Generación y Descarga */}
      <div className="pt-4 border-t border-border grid grid-cols-2 gap-3">
        <Button
          onClick={onGeneratePdf}
          disabled={isGeneratingPdf || isGeneratingExcel}
          className="w-full bg-[#D9383A] hover:bg-[#C2282A] text-white font-bold text-xs h-10 shadow-sm gap-2"
        >
          {isGeneratingPdf ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generando PDF...</span>
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              <span>Generar Pdf</span>
            </>
          )}
        </Button>

        <Button
          onClick={onGenerateExcel}
          disabled={isGeneratingPdf || isGeneratingExcel}
          className="w-full bg-[#18A29A] hover:bg-[#138C85] text-white font-bold text-xs h-10 shadow-sm gap-2"
        >
          {isGeneratingExcel ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Exportando Excel...</span>
            </>
          ) : (
            <>
              <FileSpreadsheet className="w-4 h-4" />
              <span>Generar Excel</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
