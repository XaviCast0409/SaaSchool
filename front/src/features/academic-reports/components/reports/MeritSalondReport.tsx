import React from 'react';
import { MeritClassroomReportData } from '../../types';
import { ReportHeader } from '../shared/ReportHeader';
import { ReportFooter } from '../shared/ReportFooter';
import { ReportActionToolbar } from '../shared/ReportActionToolbar';
import { MeritStatisticsSummary } from './merit/MeritStatisticsSummary';

interface MeritSalondReportProps {
  data: MeritClassroomReportData;
}

export const MeritSalondReport: React.FC<MeritSalondReportProps> = ({ data }) => {
  const { school, classroom, periodNumber, students, statistics } = data;

  const title = 'REPORTE DE ORDEN DE MÉRITO Y TERCIOS POR SALÓN';
  const subtitle = `${periodNumber}° BIMESTRE ${new Date().getFullYear()}`;

  const handleExportExcel = async () => {
    // La librería de Excel se descarga solo al exportar
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    const headers = [
      'Puesto',
      'Apellidos y Nombres',
      'Sexo',
      'Promedio',
      'Puntaje',
      '# Asignaturas Aprobadas',
      '# Asignaturas Desaprobadas',
      'Conducta',
      'Tercio',
    ];

    const rows = students.map((s) => [
      s.rank ?? '-',
      s.fullName,
      s.gender,
      s.average,
      s.points,
      s.approvedCoursesCount,
      s.failedCoursesCount > 0 ? s.failedCoursesCount : '-',
      s.conduct,
      s.tercio,
    ]);

    const ws = XLSX.utils.aoa_to_sheet([
      [`${school.name} - ${title}`],
      [`Salón: ${classroom.grade}° ${classroom.section} | Tutor: ${classroom.tutorTeacher} | ${subtitle}`],
      [],
      headers,
      ...rows,
      [],
      ['Promedio del Salón:', statistics.classroomAverage.toFixed(2)],
      ['Nota Mayor:', statistics.maxScore.toFixed(2)],
      ['Nota Menor:', statistics.minScore.toFixed(2)],
    ]);

    XLSX.utils.book_append_sheet(wb, ws, 'Merito_Salon');
    XLSX.writeFile(wb, `0048_Merito_${classroom.grade}_${classroom.section}_B${periodNumber}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <ReportActionToolbar
        reportCode="0048"
        reportTitle={`Orden de Mérito y Tercios - ${classroom.grade}° ${classroom.section}`}
        orientation="portrait"
        onExportExcel={handleExportExcel}
      />

      <div className="bg-card border border-border p-4 sm:p-6 rounded-2xl shadow-sm max-w-4xl mx-auto print:border-none print:shadow-none print:p-0">
        <ReportHeader school={school} title={title} subtitle={subtitle} extraInfoRight="Asign. Oficiales" />

        <div className="flex items-center justify-between text-xs font-semibold mb-3 border-b border-border pb-2 text-foreground">
          <div>
            <span className="text-muted-foreground font-bold">Salón:</span> {classroom.grade}° Grado {classroom.section}
          </div>
          <div>
            <span className="text-muted-foreground font-bold">Tutor(a):</span> {classroom.tutorTeacher}
          </div>
        </div>

        {/* Tabla Principal de Mérito */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse border border-foreground/50 text-xs">
            <thead>
              <tr className="bg-muted/50 font-bold text-foreground">
                <th rowSpan={2} className="border border-foreground/50 p-1.5 w-12 text-center">
                  Puesto
                </th>
                <th rowSpan={2} className="border border-foreground/50 p-1.5 min-w-[220px] text-left">
                  Apellidos y Nombres
                </th>
                <th rowSpan={2} className="border border-foreground/50 p-1.5 w-20 text-center">
                  Sexo
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
                <th rowSpan={2} className="border border-foreground/50 p-1.5 w-20 text-center">
                  Tercio
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
                <tr key={student.fullName} className="hover:bg-muted/30 transition-colors">
                  <td className="border border-foreground/50 p-1.5 text-center font-mono font-bold text-foreground">
                    {student.rank ?? '-'}
                  </td>
                  <td className="border border-foreground/50 p-1.5 font-medium uppercase">{student.fullName}</td>
                  <td className="border border-foreground/50 p-1.5 text-center text-muted-foreground">
                    {student.gender}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <MeritStatisticsSummary statistics={statistics} scopeLabel="salón" />

        <ReportFooter reportCode="0048" />
      </div>
    </div>
  );
};
