import React from 'react';
import { EducationLevel, ReportClassroomItem } from '../../types';
import { LEVEL_LABELS } from '../../constants/reportsCatalog';

const SpecificClassroomSelect: React.FC<{
  selectedClassroomId: string;
  classrooms: ReportClassroomItem[];
  onSelectClassroom: (classroomId: string) => void;
  onSelectLevel: (level: EducationLevel) => void;
  onSelectGrade: (grade: number) => void;
}> = ({ selectedClassroomId, classrooms, onSelectClassroom, onSelectLevel, onSelectGrade }) => (
  <div className="grid grid-cols-12 items-center gap-2">
    <label className="col-span-4 font-bold text-muted-foreground text-right">Salón:</label>
    <div className="col-span-8">
      <select
        value={selectedClassroomId}
        onChange={(e) => {
          const id = e.target.value;
          onSelectClassroom(id);
          const match = classrooms.find((c) => c.id === id);
          if (match) {
            onSelectLevel(match.educationLevel);
            onSelectGrade(match.grade);
          }
        }}
        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground font-semibold focus:ring-1 focus:ring-primary outline-none"
      >
        {classrooms.map((c) => (
          <option key={c.id} value={c.id}>
            {c.grade}° Grado "{c.section}" — {LEVEL_LABELS[c.educationLevel]}
          </option>
        ))}
      </select>
    </div>
  </div>
);

const MeritGradeParams: React.FC<{
  selectedLevel: EducationLevel;
  onSelectLevel: (level: EducationLevel) => void;
  selectedGrade: number;
  onSelectGrade: (grade: number) => void;
}> = ({ selectedLevel, onSelectLevel, selectedGrade, onSelectGrade }) => (
  <>
    <div className="grid grid-cols-12 items-center gap-2">
      <label className="col-span-4 font-bold text-muted-foreground text-right">Nivel:</label>
      <div className="col-span-8">
        <select
          value={selectedLevel}
          onChange={(e) => onSelectLevel(e.target.value as EducationLevel)}
          className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground focus:ring-1 focus:ring-primary outline-none"
        >
          <option value="PRIMARY">Primaria</option>
          <option value="SECONDARY">Secundaria</option>
          <option value="INITIAL">Inicial</option>
        </select>
      </div>
    </div>

    <div className="grid grid-cols-12 items-center gap-2">
      <label className="col-span-4 font-bold text-muted-foreground text-right">Grado:</label>
      <div className="col-span-8">
        <select
          value={selectedGrade}
          onChange={(e) => onSelectGrade(Number(e.target.value))}
          className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground focus:ring-1 focus:ring-primary outline-none"
        >
          {[1, 2, 3, 4, 5, 6].map((gr) => (
            <option key={gr} value={gr}>
              {gr}° Grado / Año
            </option>
          ))}
        </select>
      </div>
    </div>

    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-medium leading-tight">
      ℹ️ Ranking consolidado evaluando a <strong>todas las secciones</strong> del grado simultáneamente.
    </div>
  </>
);

const BirthdayParams: React.FC<{
  selectedMonth?: number;
  onSelectMonth?: (month: number) => void;
  selectedClassroomId: string;
  classrooms: ReportClassroomItem[];
  onSelectClassroom: (classroomId: string) => void;
}> = ({ selectedMonth, onSelectMonth, selectedClassroomId, classrooms, onSelectClassroom }) => (
  <>
    {onSelectMonth && (
      <div className="grid grid-cols-12 items-center gap-2">
        <label className="col-span-4 font-bold text-muted-foreground text-right">Mes:</label>
        <div className="col-span-8">
          <select
            value={selectedMonth ?? 0}
            onChange={(e) => onSelectMonth(Number(e.target.value))}
            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground font-semibold focus:ring-1 focus:ring-primary outline-none"
          >
            <option value={0}>Todos los Meses (Calendario Anual)</option>
            <option value={1}>Enero</option>
            <option value={2}>Febrero</option>
            <option value={3}>Marzo</option>
            <option value={4}>Abril</option>
            <option value={5}>Mayo</option>
            <option value={6}>Junio</option>
            <option value={7}>Julio</option>
            <option value={8}>Agosto</option>
            <option value={9}>Setiembre</option>
            <option value={10}>Octubre</option>
            <option value={11}>Noviembre</option>
            <option value={12}>Diciembre</option>
          </select>
        </div>
      </div>
    )}

    <div className="grid grid-cols-12 items-center gap-2">
      <label className="col-span-4 font-bold text-muted-foreground text-right">Filtrar Salón:</label>
      <div className="col-span-8">
        <select
          value={selectedClassroomId || ''}
          onChange={(e) => onSelectClassroom(e.target.value)}
          className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground font-semibold focus:ring-1 focus:ring-primary outline-none"
        >
          <option value="">Todos los Salones (Colegio Completo)</option>
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.grade}° Grado "{c.section}" — {LEVEL_LABELS[c.educationLevel]}
            </option>
          ))}
        </select>
      </div>
    </div>
  </>
);

interface ReportSpecificParamsProps {
  selectedReportCode: string;
  classrooms: ReportClassroomItem[];
  selectedLevel: EducationLevel;
  onSelectLevel: (level: EducationLevel) => void;
  selectedGrade: number;
  onSelectGrade: (grade: number) => void;
  selectedClassroomId: string;
  onSelectClassroom: (classroomId: string) => void;
  selectedMonth?: number;
  onSelectMonth?: (month: number) => void;
  selectedState?: string;
  onSelectState?: (state: string) => void;
}

export const ReportSpecificParams: React.FC<ReportSpecificParamsProps> = ({
  selectedReportCode,
  classrooms,
  selectedLevel,
  onSelectLevel,
  selectedGrade,
  onSelectGrade,
  selectedClassroomId,
  onSelectClassroom,
  selectedMonth,
  onSelectMonth,
  selectedState,
  onSelectState,
}) => {
  if (['0021', '0041', '0048', '0030', '0011'].includes(selectedReportCode)) {
    return (
      <SpecificClassroomSelect
        selectedClassroomId={selectedClassroomId}
        classrooms={classrooms}
        onSelectClassroom={onSelectClassroom}
        onSelectLevel={onSelectLevel}
        onSelectGrade={onSelectGrade}
      />
    );
  }

  if (selectedReportCode === '0049') {
    return (
      <MeritGradeParams
        selectedLevel={selectedLevel}
        onSelectLevel={onSelectLevel}
        selectedGrade={selectedGrade}
        onSelectGrade={onSelectGrade}
      />
    );
  }

  if (selectedReportCode === '0001' && onSelectState) {
    return (
      <>
        <div className="grid grid-cols-12 items-center gap-2">
          <label className="col-span-4 font-bold text-muted-foreground text-right">Estado:</label>
          <div className="col-span-8">
            <select
              value={selectedState}
              onChange={(e) => onSelectState(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground font-semibold focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="REGISTERED">Matriculados (Vigentes)</option>
              <option value="TRANSFERRED">Trasladados</option>
              <option value="WITHDRAWN">Retirados</option>
              <option value="ALL">Todos los Estados</option>
            </select>
          </div>
        </div>
        <div className="p-2 rounded-lg bg-muted border border-border text-muted-foreground text-xs leading-tight">
          Padrón institucional completo agrupado por núcleos familiares según condición de matrícula.
        </div>
      </>
    );
  }

  if (['0002', '0003'].includes(selectedReportCode)) {
    return (
      <>
        <div className="grid grid-cols-12 items-center gap-2">
          <label className="col-span-4 font-bold text-muted-foreground text-right">Filtrar Salón:</label>
          <div className="col-span-8">
            <select
              value={selectedClassroomId || ''}
              onChange={(e) => onSelectClassroom(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground font-semibold focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="">Todas las Aulas (Padrón General)</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.grade}° Grado "{c.section}" — {LEVEL_LABELS[c.educationLevel]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="p-2 rounded-lg bg-muted border border-border text-muted-foreground text-xs leading-tight">
          {selectedClassroomId
            ? 'Mostrando información restringida al aula seleccionada.'
            : 'Mostrando todo el colegio consolidado sin restricción de aula.'}
        </div>
      </>
    );
  }

  if (selectedReportCode === '0019') {
    return (
      <BirthdayParams
        selectedMonth={selectedMonth}
        onSelectMonth={onSelectMonth}
        selectedClassroomId={selectedClassroomId}
        classrooms={classrooms}
        onSelectClassroom={onSelectClassroom}
      />
    );
  }

  return null;
};
