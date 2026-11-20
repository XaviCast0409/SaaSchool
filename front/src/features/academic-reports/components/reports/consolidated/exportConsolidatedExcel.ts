import type { ConsolidatedGradesReportData } from '../../../types';

export const exportConsolidatedExcel = async (
  data: ConsolidatedGradesReportData,
  title: string,
  subtitle: string,
) => {
  const { school, classroom, periodNumber, courses, students } = data;
  const XLSX = await import('xlsx');
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
