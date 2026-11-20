import React from 'react';
import type { ConsolidatedGradesReportData, CourseStatItem } from '../../../types';

interface ConsolidatedTableStatsFooterProps {
  courses: ConsolidatedGradesReportData['courses'];
  students: ConsolidatedGradesReportData['students'];
  courseStats: Record<string, CourseStatItem>;
  totalAttendances: ConsolidatedGradesReportData['totalAttendances'];
}

export const ConsolidatedTableStatsFooter: React.FC<ConsolidatedTableStatsFooterProps> = ({
  courses,
  students,
  courseStats,
  totalAttendances,
}) => {
  return (
    <tfoot className="font-bold text-xs bg-muted/30">
      <tr>
        <td colSpan={2} className="border border-foreground/40 p-1 text-right">
          Promedio del curso:
        </td>
        {courses.map((c) => (
          <td key={c.id} className="border border-foreground/40 p-1 text-center font-mono">
            {courseStats[c.id]?.average !== null ? courseStats[c.id]?.average?.toFixed(1) : '-'}
          </td>
        ))}
        <td colSpan={5} className="border border-foreground/40 p-1 text-center font-mono">
          {(students.reduce((acc, s) => acc + (s.average || 0), 0) / (students.length || 1)).toFixed(2)}
        </td>
        <td className="border border-foreground/40 p-1 text-center font-mono">
          {totalAttendances.lateUnjustified || 0}
        </td>
        <td className="border border-foreground/40 p-1 text-center font-mono">
          {totalAttendances.lateJustified || 0}
        </td>
        <td className="border border-foreground/40 p-1 text-center font-mono">
          {totalAttendances.absentUnjustified || 0}
        </td>
        <td className="border border-foreground/40 p-1 text-center font-mono">
          {totalAttendances.absentJustified || 0}
        </td>
      </tr>
      <tr>
        <td colSpan={2} className="border border-foreground/40 p-1 text-right">
          N° de alumnos Aprobados:
        </td>
        {courses.map((c) => (
          <td key={c.id} className="border border-foreground/40 p-1 text-center font-mono text-foreground">
            {courseStats[c.id]?.approvedCount ?? '-'}
          </td>
        ))}
        <td colSpan={10} className="border border-foreground/40 p-1"></td>
      </tr>
      <tr>
        <td colSpan={2} className="border border-foreground/40 p-1 text-right">
          N° de alumnos Desaprobados:
        </td>
        {courses.map((c) => (
          <td
            key={c.id}
            className="border border-foreground/40 p-1 text-center font-mono text-red-600 font-bold"
          >
            {courseStats[c.id]?.failedCount ? courseStats[c.id]?.failedCount : '-'}
          </td>
        ))}
        <td colSpan={10} className="border border-foreground/40 p-1"></td>
      </tr>
      <tr>
        <td colSpan={2} className="border border-foreground/40 p-1 text-right">
          % de alumnos Aprobados:
        </td>
        {courses.map((c) => (
          <td key={c.id} className="border border-foreground/40 p-1 text-center font-mono">
            {courseStats[c.id]?.approvedPercent ?? 0}%
          </td>
        ))}
        <td colSpan={10} className="border border-foreground/40 p-1"></td>
      </tr>
      <tr>
        <td colSpan={2} className="border border-foreground/40 p-1 text-right">
          % de alumnos Desaprobados:
        </td>
        {courses.map((c) => (
          <td key={c.id} className="border border-foreground/40 p-1 text-center font-mono text-red-600">
            {courseStats[c.id]?.failedPercent ? `${courseStats[c.id]?.failedPercent}%` : '-'}
          </td>
        ))}
        <td colSpan={10} className="border border-foreground/40 p-1"></td>
      </tr>
      <tr>
        <td colSpan={2} className="border border-foreground/40 p-1 text-right">
          Nota Máxima:
        </td>
        {courses.map((c) => (
          <td key={c.id} className="border border-foreground/40 p-1 text-center font-mono font-bold">
            {courseStats[c.id]?.maxScore ?? '-'}
          </td>
        ))}
        <td colSpan={10} className="border border-foreground/40 p-1"></td>
      </tr>
      <tr>
        <td colSpan={2} className="border border-foreground/40 p-1 text-right">
          Nota Mínima:
        </td>
        {courses.map((c) => (
          <td key={c.id} className="border border-foreground/40 p-1 text-center font-mono">
            {courseStats[c.id]?.minScore ?? '-'}
          </td>
        ))}
        <td colSpan={10} className="border border-foreground/40 p-1"></td>
      </tr>
    </tfoot>
  );
};
