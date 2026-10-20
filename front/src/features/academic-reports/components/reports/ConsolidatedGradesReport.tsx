import React from 'react';
import * as XLSX from 'xlsx';
import { ConsolidatedGradesReportData } from '../../types';
import { ReportHeader } from '../shared/ReportHeader';
import { ReportFooter } from '../shared/ReportFooter';
import { ReportActionToolbar } from '../shared/ReportActionToolbar';

interface ConsolidatedGradesReportProps {
  data: ConsolidatedGradesReportData;
}

export const ConsolidatedGradesReport: React.FC<ConsolidatedGradesReportProps> = ({ data }) => {
  const { school, classroom, periodNumber, courses, students, courseStats, totalAttendances } = data;

  const title = `CONSOLIDADO DE NOTAS - ${new Date().getFullYear()}`;
  const subtitle = `${classroom.grade}° Grado ${classroom.section} - ${periodNumber}° Bimestre`;

  // Exportar a Excel con formato tabular
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const headers = [
      'N°',
      'APELLIDOS Y NOMBRES',
      ...courses.map((c) => c.name),
      'CONDUCTA',
      'PROMEDIO',
      'PUNTAJE',
      'N° DESAPROBADOS',
      'ORDEN DE MÉRITO',
      'TERCIO',
      'Tardanza Injustificada',
      'Tardanza Justificada',
      'Falta Injustificada',
      'Falta Justificada',
    ];

    const rows = students.map((s) => [
      s.orderIndex,
      s.fullName,
      ...courses.map((c) => s.courseScores[c.id] ?? '-'),
      s.conduct,
      s.average !== null ? s.average.toFixed(2) : '-',
      s.points,
      s.failedCoursesCount > 0 ? s.failedCoursesCount : '-',
      s.meritOrder ?? '-',
      s.tercio ?? '-',
      s.attendance.lateUnjustified || '-',
      s.attendance.lateJustified || '-',
      s.attendance.absentUnjustified || '-',
      s.attendance.absentJustified || '-',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([
      [`${school.name} - ${title}`],
      [`Salón: ${subtitle} | Tutor: ${classroom.tutorTeacher}`],
      [],
      headers,
      ...rows,
    ]);

    XLSX.utils.book_append_sheet(wb, ws, 'Consolidado');
    XLSX.writeFile(wb, `0021_Consolidado_${classroom.grade}_${classroom.section}_B${periodNumber}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <ReportActionToolbar
        reportCode="0021"
        reportTitle={`Consolidado de Estudios - ${classroom.grade}° ${classroom.section}`}
        orientation="landscape"
        onExportExcel={handleExportExcel}
      />

      <div className="bg-card border border-border p-4 sm:p-6 rounded-2xl shadow-sm overflow-x-auto print:border-none print:shadow-none print:p-0">
        <ReportHeader
          school={school}
          title={title}
          subtitle={subtitle}
          tutorTeacher={classroom.tutorTeacher}
        />

        {/* Tabla Matricial de Calificaciones */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-foreground/40 text-[10px] leading-tight">
            <thead>
              <tr className="bg-muted/60 text-foreground font-bold">
                <th rowSpan={2} className="border border-foreground/40 p-1 w-6 text-center">N°</th>
                <th rowSpan={2} className="border border-foreground/40 p-1.5 min-w-[200px] text-left">APELLIDOS Y NOMBRES</th>
                <th colSpan={courses.length} className="border border-foreground/40 p-1 text-center uppercase tracking-wider">
                  ASIGNATURAS / ÁREAS CURRICULARES
                </th>
                <th rowSpan={2} className="border border-foreground/40 p-1 w-10 text-center [writing-mode:vertical-lr] rotate-180">CONDUCTA</th>
                <th rowSpan={2} className="border border-foreground/40 p-1 w-12 text-center [writing-mode:vertical-lr] rotate-180">PROMEDIO</th>
                <th rowSpan={2} className="border border-foreground/40 p-1 w-10 text-center [writing-mode:vertical-lr] rotate-180">PUNTAJE</th>
                <th rowSpan={2} className="border border-foreground/40 p-1 w-10 text-center [writing-mode:vertical-lr] rotate-180">N° DESAPROB.</th>
                <th rowSpan={2} className="border border-foreground/40 p-1 w-10 text-center [writing-mode:vertical-lr] rotate-180">ORDEN MÉRITO</th>
                <th rowSpan={2} className="border border-foreground/40 p-1 w-10 text-center [writing-mode:vertical-lr] rotate-180">TERCIO</th>
                <th rowSpan={2} className="border border-foreground/40 p-1 w-8 text-center [writing-mode:vertical-lr] rotate-180">Tardanza Injust.</th>
                <th rowSpan={2} className="border border-foreground/40 p-1 w-8 text-center [writing-mode:vertical-lr] rotate-180">Tardanza Just.</th>
                <th rowSpan={2} className="border border-foreground/40 p-1 w-8 text-center [writing-mode:vertical-lr] rotate-180">Falta Injust.</th>
                <th rowSpan={2} className="border border-foreground/40 p-1 w-8 text-center [writing-mode:vertical-lr] rotate-180">Falta Just.</th>
              </tr>
              <tr className="bg-muted/40 text-foreground font-semibold">
                {courses.map((course) => (
                  <th
                    key={course.id}
                    className="border border-foreground/40 p-1 min-w-[32px] max-w-[42px] text-center [writing-mode:vertical-lr] rotate-180 text-[9px] h-32 truncate"
                    title={course.name}
                  >
                    {course.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.enrollmentId} className="hover:bg-muted/30 transition-colors">
                  <td className="border border-foreground/40 p-1 text-center font-mono font-medium">{student.orderIndex}</td>
                  <td className="border border-foreground/40 p-1.5 font-medium uppercase truncate max-w-[220px]">
                    {student.fullName}
                  </td>
                  {courses.map((course) => {
                    const score = student.courseScores[course.id];
                    const isFailing = score !== null && score < 10.5;
                    return (
                      <td
                        key={course.id}
                        className={`border border-foreground/40 p-1 text-center font-mono text-[10px] ${
                          isFailing ? 'text-red-600 font-bold bg-red-500/5' : 'text-foreground'
                        }`}
                      >
                        {score !== null ? String(Math.round(score)).padStart(2, '0') : '-'}
                      </td>
                    );
                  })}
                  <td className="border border-foreground/40 p-1 text-center font-mono font-bold text-foreground">
                    {student.conduct}
                  </td>
                  <td className="border border-foreground/40 p-1 text-center font-mono font-bold text-foreground">
                    {student.average !== null ? student.average.toFixed(2) : '-'}
                  </td>
                  <td className="border border-foreground/40 p-1 text-center font-mono font-medium text-foreground">
                    {student.points}
                  </td>
                  <td className="border border-foreground/40 p-1 text-center font-mono font-bold text-red-600">
                    {student.failedCoursesCount > 0 ? student.failedCoursesCount : '-'}
                  </td>
                  <td className="border border-foreground/40 p-1 text-center font-mono font-bold text-foreground">
                    {student.meritOrder ?? '-'}
                  </td>
                  <td className="border border-foreground/40 p-1 text-center font-mono font-bold uppercase text-foreground">
                    {student.tercio ?? '-'}
                  </td>
                  <td className="border border-foreground/40 p-1 text-center font-mono text-muted-foreground">
                    {student.attendance.lateUnjustified || '-'}
                  </td>
                  <td className="border border-foreground/40 p-1 text-center font-mono text-muted-foreground">
                    {student.attendance.lateJustified || '-'}
                  </td>
                  <td className="border border-foreground/40 p-1 text-center font-mono text-muted-foreground">
                    {student.attendance.absentUnjustified || '-'}
                  </td>
                  <td className="border border-foreground/40 p-1 text-center font-mono text-muted-foreground">
                    {student.attendance.absentJustified || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Pie de Estadísticas del Curso */}
            <tfoot className="font-bold text-[9px] bg-muted/30">
              <tr>
                <td colSpan={2} className="border border-foreground/40 p-1 text-right">Promedio del curso:</td>
                {courses.map((c) => (
                  <td key={c.id} className="border border-foreground/40 p-1 text-center font-mono">
                    {courseStats[c.id]?.average !== null ? courseStats[c.id]?.average?.toFixed(1) : '-'}
                  </td>
                ))}
                <td colSpan={5} className="border border-foreground/40 p-1 text-center font-mono">
                  {(students.reduce((acc, s) => acc + (s.average || 0), 0) / (students.length || 1)).toFixed(2)}
                </td>
                <td className="border border-foreground/40 p-1 text-center font-mono">{totalAttendances.lateUnjustified || 0}</td>
                <td className="border border-foreground/40 p-1 text-center font-mono">{totalAttendances.lateJustified || 0}</td>
                <td className="border border-foreground/40 p-1 text-center font-mono">{totalAttendances.absentUnjustified || 0}</td>
                <td className="border border-foreground/40 p-1 text-center font-mono">{totalAttendances.absentJustified || 0}</td>
              </tr>
              <tr>
                <td colSpan={2} className="border border-foreground/40 p-1 text-right">N° de alumnos Aprobados:</td>
                {courses.map((c) => (
                  <td key={c.id} className="border border-foreground/40 p-1 text-center font-mono text-foreground">
                    {courseStats[c.id]?.approvedCount ?? '-'}
                  </td>
                ))}
                <td colSpan={10} className="border border-foreground/40 p-1"></td>
              </tr>
              <tr>
                <td colSpan={2} className="border border-foreground/40 p-1 text-right">N° de alumnos Desaprobados:</td>
                {courses.map((c) => (
                  <td key={c.id} className="border border-foreground/40 p-1 text-center font-mono text-red-600 font-bold">
                    {courseStats[c.id]?.failedCount ? courseStats[c.id]?.failedCount : '-'}
                  </td>
                ))}
                <td colSpan={10} className="border border-foreground/40 p-1"></td>
              </tr>
              <tr>
                <td colSpan={2} className="border border-foreground/40 p-1 text-right">% de alumnos Aprobados:</td>
                {courses.map((c) => (
                  <td key={c.id} className="border border-foreground/40 p-1 text-center font-mono">
                    {courseStats[c.id]?.approvedPercent ?? 0}%
                  </td>
                ))}
                <td colSpan={10} className="border border-foreground/40 p-1"></td>
              </tr>
              <tr>
                <td colSpan={2} className="border border-foreground/40 p-1 text-right">% de alumnos Desaprobados:</td>
                {courses.map((c) => (
                  <td key={c.id} className="border border-foreground/40 p-1 text-center font-mono text-red-600">
                    {courseStats[c.id]?.failedPercent ? `${courseStats[c.id]?.failedPercent}%` : '-'}
                  </td>
                ))}
                <td colSpan={10} className="border border-foreground/40 p-1"></td>
              </tr>
              <tr>
                <td colSpan={2} className="border border-foreground/40 p-1 text-right">Nota Máxima:</td>
                {courses.map((c) => (
                  <td key={c.id} className="border border-foreground/40 p-1 text-center font-mono font-bold">
                    {courseStats[c.id]?.maxScore ?? '-'}
                  </td>
                ))}
                <td colSpan={10} className="border border-foreground/40 p-1"></td>
              </tr>
              <tr>
                <td colSpan={2} className="border border-foreground/40 p-1 text-right">Nota Mínima:</td>
                {courses.map((c) => (
                  <td key={c.id} className="border border-foreground/40 p-1 text-center font-mono">
                    {courseStats[c.id]?.minScore ?? '-'}
                  </td>
                ))}
                <td colSpan={10} className="border border-foreground/40 p-1"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <ReportFooter reportCode="0021" />
      </div>
    </div>
  );
};
