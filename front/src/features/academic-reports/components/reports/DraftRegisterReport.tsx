import React from 'react';
import { DraftRegisterReportData } from '../../types';
import { ReportHeader } from '../shared/ReportHeader';
import { ReportFooter } from '../shared/ReportFooter';
import { ReportActionToolbar } from '../shared/ReportActionToolbar';

interface DraftRegisterReportProps {
  data: DraftRegisterReportData;
}

export const DraftRegisterReport: React.FC<DraftRegisterReportProps> = ({ data }) => {
  const { school, classroom, course, students, blankCriteriaColumnsCount = 20 } = data;

  const title = `REGISTRO AUXILIAR BORRADOR - ${new Date().getFullYear()}`;
  const subtitle = `${classroom.grade}° Grado ${classroom.section}`;

  const blankColumns = Array.from({ length: blankCriteriaColumnsCount }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      <ReportActionToolbar
        reportCode="0041"
        reportTitle={`Registro Auxiliar Borrador - ${classroom.grade}° ${classroom.section}`}
        orientation="landscape"
      />

      <div className="bg-card border border-border p-4 sm:p-6 rounded-2xl shadow-sm overflow-x-auto print:border-none print:shadow-none print:p-0">
        <ReportHeader
          school={school}
          title={title}
          subtitle={subtitle}
        />

        {/* Metadatos manuales para el profesor */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold border-b border-border pb-3 mb-3 text-foreground">
          <div><span className="text-muted-foreground font-bold">Salón:</span> {classroom.grade}° Grado {classroom.section}</div>
          <div><span className="text-muted-foreground font-bold">Curso:</span> {course ? course.name : '________________________'}</div>
          <div><span className="text-muted-foreground font-bold">Profesor:</span> {course ? course.teacherName : '________________________'}</div>
          <div><span className="text-muted-foreground font-bold">Periodo:</span> ________________________</div>
        </div>

        {/* Tabla Borrador Cuadriculada */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-foreground/50 text-[10px]">
            <thead>
              <tr className="bg-muted/40 font-bold">
                <th rowSpan={2} className="border border-foreground/50 p-1 w-7 text-center">N°</th>
                <th rowSpan={2} className="border border-foreground/50 p-1.5 min-w-[220px] text-left">Apellidos y Nombres</th>
                <th colSpan={blankCriteriaColumnsCount} className="border border-foreground/50 p-1.5 text-center uppercase tracking-wider text-[11px]">
                  CRITERIOS DE EVALUACIÓN
                </th>
              </tr>
              <tr className="h-7 bg-muted/20">
                {blankColumns.map((col) => (
                  <th key={col} className="border border-foreground/50 p-1 w-7 min-w-[26px]"></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.enrollmentId} className="h-6">
                  <td className="border border-foreground/50 p-1 text-center font-mono font-medium">{student.index}</td>
                  <td className="border border-foreground/50 p-1.5 font-medium uppercase truncate max-w-[240px]">
                    {student.fullName}
                  </td>
                  {blankColumns.map((col) => (
                    <td key={col} className="border border-foreground/50 p-0 text-center"></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ReportFooter reportCode="0041" />
      </div>
    </div>
  );
};
