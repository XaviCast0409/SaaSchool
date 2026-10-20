import React, { useMemo } from 'react';
import { Layers, Filter } from 'lucide-react';
import { ReportClassroomItem, EducationLevel, ReportCode } from '../types';

interface AcademicReportsFilterBarProps {
  reportCode: ReportCode;
  classrooms: ReportClassroomItem[];
  selectedLevel: EducationLevel;
  onSelectLevel: (level: EducationLevel) => void;
  selectedGrade: number;
  onSelectGrade: (grade: number) => void;
  selectedClassroomId: string;
  onSelectClassroom: (classroomId: string) => void;
  selectedPeriod: number;
  onSelectPeriod: (period: number) => void;
}

const LEVEL_LABELS: Record<EducationLevel, string> = {
  INITIAL: 'Inicial',
  PRIMARY: 'Primaria',
  SECONDARY: 'Secundaria',
};

export const AcademicReportsFilterBar: React.FC<AcademicReportsFilterBarProps> = ({
  reportCode,
  classrooms,
  selectedLevel,
  onSelectLevel,
  selectedGrade,
  onSelectGrade,
  selectedClassroomId,
  onSelectClassroom,
  selectedPeriod,
  onSelectPeriod,
}) => {
  // Niveles disponibles
  const availableLevels = useMemo(() => {
    const set = new Set<EducationLevel>();
    classrooms.forEach((c) => set.add(c.educationLevel));
    return Array.from(set).sort();
  }, [classrooms]);

  // Grados disponibles para el nivel seleccionado
  const availableGrades = useMemo(() => {
    const set = new Set<number>();
    classrooms
      .filter((c) => c.educationLevel === selectedLevel)
      .forEach((c) => set.add(c.grade));
    return Array.from(set).sort((a, b) => a - b);
  }, [classrooms, selectedLevel]);

  // Secciones / Aulas disponibles para el nivel y grado seleccionados
  const availableSections = useMemo(() => {
    return classrooms
      .filter((c) => c.educationLevel === selectedLevel && c.grade === selectedGrade)
      .sort((a, b) => a.section.localeCompare(b.section));
  }, [classrooms, selectedLevel, selectedGrade]);

  const isGradeOnlyReport = reportCode === '0049';
  const isPeriodIrrelevant = reportCode === '0011';

  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-sm mb-4 print:hidden flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wide">
          <Filter className="w-3.5 h-3.5 text-primary" />
          <span>Filtros:</span>
        </div>

        {/* Nivel Educativo */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Nivel:</label>
          <select
            value={selectedLevel}
            onChange={(e) => onSelectLevel(e.target.value as EducationLevel)}
            className="text-xs font-medium bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:ring-1 focus:ring-primary outline-none"
          >
            {availableLevels.map((lvl) => (
              <option key={lvl} value={lvl}>
                {LEVEL_LABELS[lvl] || lvl}
              </option>
            ))}
          </select>
        </div>

        {/* Grado */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Grado:</label>
          <select
            value={selectedGrade}
            onChange={(e) => onSelectGrade(Number(e.target.value))}
            className="text-xs font-medium bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:ring-1 focus:ring-primary outline-none"
          >
            {availableGrades.map((gr) => (
              <option key={gr} value={gr}>
                {gr}° Grado / Año
              </option>
            ))}
          </select>
        </div>

        {/* Sección / Aula (Se desactiva si es reporte 0049 ya que es a nivel de grado completo) */}
        {!isGradeOnlyReport ? (
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Sección:</label>
            <select
              value={selectedClassroomId}
              onChange={(e) => onSelectClassroom(e.target.value)}
              className="text-xs font-medium bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:ring-1 focus:ring-primary outline-none max-w-[180px]"
            >
              {availableSections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  Sección {sec.section} ({sec._count.enrollments} alumnos)
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 border border-primary/20 rounded-lg text-[11px] font-bold text-primary">
            <Layers className="w-3.5 h-3.5" />
            <span>Consolida todas las secciones del grado ({availableSections.length} aulas)</span>
          </div>
        )}

        {/* Periodo / Bimestre */}
        {!isPeriodIrrelevant && (
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Periodo:</label>
            <select
              value={selectedPeriod}
              onChange={(e) => onSelectPeriod(Number(e.target.value))}
              className="text-xs font-medium bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:ring-1 focus:ring-primary outline-none"
            >
              <option value={1}>1er Bimestre</option>
              <option value={2}>2do Bimestre</option>
              <option value={3}>3er Bimestre</option>
              <option value={4}>4to Bimestre</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
