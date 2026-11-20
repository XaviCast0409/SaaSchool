import React from 'react';
import { MeritGradeReportData } from '../../types';
import { ReportHeader } from '../shared/ReportHeader';
import { ReportFooter } from '../shared/ReportFooter';
import { ReportActionToolbar } from '../shared/ReportActionToolbar';
import { MeritStatisticsSummary } from './merit/MeritStatisticsSummary';

interface MeritGradeReportProps {
  data: MeritGradeReportData;
}

const LEVEL_NAMES: Record<string, string> = {
  INITIAL: 'Inicial',
  PRIMARY: 'Primaria',
  SECONDARY: 'Secundaria',
};

export const MeritGradeReport: React.FC<MeritGradeReportProps> = ({ data }) => {
  const { school, educationLevel, grade, periodNumber, students, statistics } = data;

  const title = 'REPORTE DE ORDEN DE MÉRITO Y TERCIOS POR GRADO';
  const subtitle = `${periodNumber}° BIMESTRE ${new Date().getFullYear()}`;

  const handleExportExcel = async () => {
    // La librería de Excel se descarga solo al exportar
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    const headers = [
      'Puesto',
      'Apellidos y Nombres',
      'Sexo',
      'Sección',
      'Promedio',
      'Puntaje',
      '# Asignaturas Aprobadas',
      '# Asignaturas Desaprobadas',
      'Conducta',
      'Tercio',
      'Quinto',
    ];

    const rows = students.map((s) => [
      s.rank,
      s.fullName,
      s.gender,
      s.section,
      s.average,
      s.points,
      s.approvedCoursesCount,
      s.failedCoursesCount > 0 ? s.failedCoursesCount : '-',
      s.conduct,
      s.tercio,
      s.quinto,
    ]);

    const ws = XLSX.utils.aoa_to_sheet([
      [`${school.name} - ${title}`],
      [`Nivel: ${LEVEL_NAMES[educationLevel] || educationLevel} | Grado: ${grade}° Grado | ${subtitle}`],
      [],
      headers,
      ...rows,
      [],
      ['Promedio del Grado:', statistics.gradeAverage.toFixed(2)],
      ['Nota Mayor:', statistics.maxScore.toFixed(2)],
      ['Nota Menor:', statistics.minScore.toFixed(2)],
    ]);

    XLSX.utils.book_append_sheet(wb, ws, 'Merito_Grado');
    XLSX.writeFile(wb, `0049_Merito_Grado_${educationLevel}_${grade}_B${periodNumber}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <ReportActionToolbar
        reportCode="0049"
        reportTitle={`Orden de Mérito y Tercios por Grado - ${grade}° ${LEVEL_NAMES[educationLevel]}`}
        orientation="portrait"
        onExportExcel={handleExportExcel}
      />

      <div className="bg-card border border-border p-4 sm:p-6 rounded-2xl shadow-sm max-w-4xl mx-auto print:border-none print:shadow-none print:p-0">
        <ReportHeader school={school} title={title} subtitle={subtitle} extraInfoRight="Asign. Oficiales" />

        <div className="flex items-center justify-between text-xs font-semibold mb-3 border-b border-border pb-2 text-foreground">
          <div>
            <span className="text-muted-foreground font-bold">Nivel:</span>{' '}
            {LEVEL_NAMES[educationLevel] || educationLevel}
          </div>
          <div>
            <span className="text-muted-foreground font-bold">Grado:</span> {grade}° Grado / Año (Consolidado General)
          </div>
        </div>

        {/* Tabla Principal de Mérito por Grado */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse border border-foreground/50 text-xs">
            <thead>
              <tr className="bg-muted/50 font-bold text-foreground">
                <th rowSpan={2} className="border border-foreground/50 p-1.5 w-12 text-center">
                  Puesto
                </th>
                <th rowSpan={2} className="border border-foreground/50 p-1.5 min-w-[200px] text-left">
                  Apellidos y Nombres
                </th>
                <th rowSpan={2} className="border border-foreground/50 p-1.5 w-16 text-center">
                  Sexo
                </th>
                <th rowSpan={2} className="border border-foreground/50 p-1.5 w-14 text-center">
                  Sección
                </th>
                <th rowSpan={2} className="border border-foreground/50 p-1.5 w-16 text-center">
                  Promedio
                </th>
                <th rowSpan={2} className="border border-foreground/50 p-1.5 w-14 text-center">
                  Puntaje
                </th>
                <th colSpan={3} className="border border-foreground/50 p-1 text-center">
                  #Asignaturas
                </th>
                <th rowSpan={2} className="border border-foreground/50 p-1.5 w-16 text-center">
                  Conducta
                </th>
                <th rowSpan={2} className="border border-foreground/50 p-1.5 w-16 text-center">
                  Tercio
                </th>
                <th rowSpan={2} className="border border-foreground/50 p-1.5 w-16 text-center">
                  Quinto
                </th>
              </tr>
              <tr className="bg-muted/30 font-semibold text-foreground text-xs">
                <th className="border border-foreground/50 p-1 w-10 text-center">Aprob.</th>
                <th className="border border-foreground/50 p-1 w-10 text-center">Desap.</th>
                <th className="border border-foreground/50 p-1 w-8 text-center">SN</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={`${student.enrollmentId}-${student.rank}`} className="hover:bg-muted/30 transition-colors">
                  <td className="border border-foreground/50 p-1.5 text-center font-mono font-bold text-foreground">
                    {student.rank}
                  </td>
                  <td className="border border-foreground/50 p-1.5 font-medium uppercase">{student.fullName}</td>
                  <td className="border border-foreground/50 p-1.5 text-center text-muted-foreground">
                    {student.gender}
                  </td>
                  <td className="border border-foreground/50 p-1.5 text-center font-bold text-foreground">
                    {student.section}
                  </td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono font-bold text-foreground">
                    {student.average}
                  </td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono">{student.points}</td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono">
                    {student.approvedCoursesCount}
                  </td>
                  <td
                    className={`border border-foreground/50 p-1.5 text-center font-mono ${student.failedCoursesCount > 0 ? 'text-red-600 font-bold' : ''}`}
                  >
                    {student.failedCoursesCount > 0 ? student.failedCoursesCount : ''}
                  </td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono text-muted-foreground">
                    {student.hasNoGrades ? '1' : ''}
                  </td>
                  <td className="border border-foreground/50 p-1.5 text-center font-mono font-bold">
                    {student.conduct}
                  </td>
                  <td className="border border-foreground/50 p-1.5 text-center font-semibold uppercase">
                    {student.tercio}
                  </td>
                  <td className="border border-foreground/50 p-1.5 text-center font-semibold uppercase">
                    {student.quinto}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <MeritStatisticsSummary statistics={statistics} scopeLabel="Grado" />

        <ReportFooter reportCode="0049" />
      </div>
    </div>
  );
};
