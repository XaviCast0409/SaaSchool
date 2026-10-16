import React from 'react';
import { School, BookOpen, Calendar, UserCheck } from 'lucide-react';

interface ClassroomOption {
  id: string;
  grade: number;
  section: string;
  educationLevel: string;
}

interface CourseOption {
  id: string;
  name: string;
  officialCode?: string;
  teacherName: string;
}

interface GradesFilterBarProps {
  selectedClassroomId: string;
  selectedCourseAssignmentId: string;
  selectedPeriod: number;
  showWithdrawn: boolean;
  showTransferred: boolean;
  teacherName?: string;
  classrooms: ClassroomOption[];
  courses: CourseOption[];
  onClassroomChange: (id: string) => void;
  onCourseChange: (id: string) => void;
  onPeriodChange: (period: number) => void;
  onToggleWithdrawn: (show: boolean) => void;
  onToggleTransferred: (show: boolean) => void;
}

const LEVEL_LABEL: Record<string, string> = {
  INITIAL: 'Inicial',
  PRIMARY: 'Primaria',
  SECONDARY: 'Secundaria',
};

export const GradesFilterBar: React.FC<GradesFilterBarProps> = ({
  selectedClassroomId,
  selectedCourseAssignmentId,
  selectedPeriod,
  showWithdrawn,
  showTransferred,
  teacherName,
  classrooms,
  courses,
  onClassroomChange,
  onCourseChange,
  onPeriodChange,
  onToggleWithdrawn,
  onToggleTransferred,
}) => {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
      {/* Fila Principal de Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        {/* Selector de Salón */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
            <School className="w-3.5 h-3.5 text-primary" />
            <span>Salón / Aula</span>
          </label>
          <div className="relative">
            <select
              value={selectedClassroomId}
              onChange={(e) => onClassroomChange(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              <option value="">— Selecciona un Salón —</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.grade}° "{c.section}" — {LEVEL_LABEL[c.educationLevel] || c.educationLevel}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selector de Curso */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            <span>Curso / Asignatura</span>
          </label>
          <div className="relative">
            <select
              value={selectedCourseAssignmentId}
              onChange={(e) => onCourseChange(e.target.value)}
              disabled={!selectedClassroomId}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {selectedClassroomId
                  ? '— Selecciona un Curso —'
                  : '— Primero elige un salón —'}
              </option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.officialCode ? `[${course.officialCode}] ` : ''}
                  {course.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selector de Periodo */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>Periodo Académico</span>
          </label>
          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => onPeriodChange(Number(e.target.value))}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              <option value={1}>1° Bimestre</option>
              <option value={2}>2° Bimestre</option>
              <option value={3}>3° Bimestre</option>
              <option value={4}>4° Bimestre</option>
            </select>
          </div>
        </div>

        {/* Nombre del Profesor a Cargo */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-primary" />
            <span>Docente Asignado</span>
          </label>
          <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-xs font-semibold text-foreground truncate">
            {teacherName || '— Sin asignar —'}
          </div>
        </div>
      </div>

      {/* Fila Secundaria: Checkboxes de Estado de Alumnos */}
      <div className="flex items-center justify-between border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
            <input
              type="checkbox"
              checked={showWithdrawn}
              onChange={(e) => onToggleWithdrawn(e.target.checked)}
              className="rounded border-input text-primary focus:ring-ring w-3.5 h-3.5 cursor-pointer"
            />
            <span>Mostrar Retirados</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
            <input
              type="checkbox"
              checked={showTransferred}
              onChange={(e) => onToggleTransferred(e.target.checked)}
              className="rounded border-input text-primary focus:ring-ring w-3.5 h-3.5 cursor-pointer"
            />
            <span>Mostrar Trasladados</span>
          </label>
        </div>

        <span className="text-[11px] text-muted-foreground italic hidden sm:inline">
          Escala Vigesimal Oficial CNEB (0 - 20) con equivalencia automática MINEDU (AD / A / B / C)
        </span>
      </div>
    </div>
  );
};
