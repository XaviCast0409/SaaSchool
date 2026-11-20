import React from 'react';
import { usePeriods } from '@/features/academic-years/api/useAcademicYears';
import { ConsolidatedGradesReportData } from '../../types';
import { ReportHeader } from '../shared/ReportHeader';
import { ReportFooter } from '../shared/ReportFooter';
import { ReportActionToolbar } from '../shared/ReportActionToolbar';
import { ConsolidatedTableStatsFooter } from './consolidated/ConsolidatedTableStatsFooter';
import { exportConsolidatedExcel } from './consolidated/exportConsolidatedExcel';

interface ConsolidatedGradesReportProps {
  data: ConsolidatedGradesReportData;
}

export const ConsolidatedGradesReport: React.FC<ConsolidatedGradesReportProps> = ({ data }) => {
  const { label: periodLabel } = usePeriods();
  const { school, classroom, periodNumber, courses, students, courseStats, totalAttendances } = data;

  const title = `CONSOLIDADO DE NOTAS - ${new Date().getFullYear()}`;
  const subtitle = `${classroom.grade}° Grado ${classroom.section} - ${periodNumber}° ${periodLabel}`;

  const handleExportExcel = () => exportConsolidatedExcel(data, title, subtitle);

  return (
    <div className="space-y-4">
      <ReportActionToolbar
        reportCode="0021"
        reportTitle={`Consolidado de Estudios - ${classroom.grade}° ${classroom.section}`}
        orientation="landscape"
        onExportExcel={handleExportExcel}
      />

      <div className="bg-card border border-border p-4 sm:p-6 rounded-2xl shadow-sm overflow-x-auto print:border-none print:shadow-none print:p-0">
        <ReportHeader school={school} title={title} subtitle={subtitle} tutorTeacher={classroom.tutorTeacher} />

        {/* Tabla Matricial de Calificaciones */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-foreground/40 text-xs leading-tight">
            <thead>
              <tr className="bg-muted/60 text-foreground font-bold">
                <th rowSpan={2} className="border border-foreground/40 p-1 w-6 text-center">
                  N°
                </th>
                <th rowSpan={2} className="border border-foreground/40 p-1.5 min-w-[200px] text-left">
                  APELLIDOS Y NOMBRES
                </th>
                <th
                  colSpan={courses.length}
                  className="border border-foreground/40 p-1 text-center uppercase tracking-wider"
                >
                  ASIGNATURAS / ÁREAS CURRICULARES
                </th>
                <th
                  rowSpan={2}
                  className="border border-foreground/40 p-1 w-10 text-center [writing-mode:vertical-lr] rotate-180"
                >
                  CONDUCTA
                </th>
                <th
                  rowSpan={2}
                  className="border border-foreground/40 p-1 w-12 text-center [writing-mode:vertical-lr] rotate-180"
                >
                  PROMEDIO
                </th>
                <th
                  rowSpan={2}
                  className="border border-foreground/40 p-1 w-10 text-center [writing-mode:vertical-lr] rotate-180"
                >
                  PUNTAJE
                </th>
                <th
                  rowSpan={2}
                  className="border border-foreground/40 p-1 w-10 text-center [writing-mode:vertical-lr] rotate-180"
                >
                  N° DESAPROB.
                </th>
                <th
                  rowSpan={2}
                  className="border border-foreground/40 p-1 w-10 text-center [writing-mode:vertical-lr] rotate-180"
                >
                  ORDEN MÉRITO
                </th>
                <th
                  rowSpan={2}
                  className="border border-foreground/40 p-1 w-10 text-center [writing-mode:vertical-lr] rotate-180"
                >
                  TERCIO
                </th>
                <th
                  rowSpan={2}
                  className="border border-foreground/40 p-1 w-8 text-center [writing-mode:vertical-lr] rotate-180"
                >
                  Tardanza Injust.
                </th>
                <th
                  rowSpan={2}
                  className="border border-foreground/40 p-1 w-8 text-center [writing-mode:vertical-lr] rotate-180"
                >
                  Tardanza Just.
                </th>
                <th
                  rowSpan={2}
                  className="border border-foreground/40 p-1 w-8 text-center [writing-mode:vertical-lr] rotate-180"
                >
                  Falta Injust.
                </th>
                <th
                  rowSpan={2}
                  className="border border-foreground/40 p-1 w-8 text-center [writing-mode:vertical-lr] rotate-180"
                >
                  Falta Just.
                </th>
              </tr>
              <tr className="bg-muted/40 text-foreground font-semibold">
                {courses.map((course) => (
                  <th
                    key={course.id}
                    className="border border-foreground/40 p-1 min-w-[32px] max-w-[42px] text-center [writing-mode:vertical-lr] rotate-180 text-xs h-32 truncate"
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
                  <td className="border border-foreground/40 p-1 text-center font-mono font-medium">
                    {student.orderIndex}
                  </td>
                  <td className="border border-foreground/40 p-1.5 font-medium uppercase truncate max-w-[220px]">
                    {student.fullName}
                  </td>
                  {courses.map((course) => {
                    const score = student.courseScores[course.id];
                    const isFailing = score !== null && score < 10.5;
                    return (
                      <td
                        key={course.id}
                        className={`border border-foreground/40 p-1 text-center font-mono text-xs ${
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
            <ConsolidatedTableStatsFooter
              courses={courses}
              students={students}
              courseStats={courseStats}
              totalAttendances={totalAttendances}
            />
          </table>
        </div>

        <ReportFooter reportCode="0021" />
      </div>
    </div>
  );
};
