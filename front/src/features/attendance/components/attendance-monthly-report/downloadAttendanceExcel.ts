import type { AttendanceExportRow } from '../../types';

const SPANISH_MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Setiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export function formatMonthSpanish(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number);
  if (!y || !m) return monthStr;
  return `${SPANISH_MONTHS[m - 1].toUpperCase()} ${y}`;
}

export function navigateMonth(currentMonthStr: string, delta: number): string {
  const [y, m] = currentMonthStr.split('-').map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  const nextY = date.getFullYear();
  const nextM = String(date.getMonth() + 1).padStart(2, '0');
  return `${nextY}-${nextM}`;
}

/** Genera y descarga el Acta Mensual de Asistencia en formato Excel (.xlsx) Profesional */
export async function downloadAttendanceExcel(rows: AttendanceExportRow[], monthStr: string): Promise<void> {
  const XLSX = await import('xlsx');
  const periodText = formatMonthSpanish(monthStr);

  const title1 = ['REPUBLICA DEL PERU - MINISTERIO DE EDUCACION'];
  const title2 = ['ACTA OFICIAL CONSOLIDADA DE ASISTENCIA Y PERMANENCIA ESCOLAR'];
  const title3 = [`PERIODO LECTIVO: ${periodText}`];
  const blankRow: string[] = [];

  const headers = [
    'N°',
    'APELLIDOS Y NOMBRES DEL ESTUDIANTE',
    'DOC. IDENTIDAD',
    'GRADO',
    'SECCION',
    'PRES. (P)',
    'TARD. JUST. (TJ)',
    'TARD. INJ. (TI)',
    'FAL. JUST. (FJ)',
    'FAL. INJ. (FI)',
    '% ASISTENCIA',
    'ESTADO FINAL',
  ];

  const dataRows = rows.map((row, index) => {
    let evalStatus = 'REGULAR';
    if (row.attendanceRate < 80) evalStatus = 'OBSERVADO (RIESGO)';
    else if (row.counts.ABSENT_UNJUSTIFIED >= 3) evalStatus = 'ALERTA DE FALTAS';

    return [
      index + 1,
      row.studentName.toUpperCase(),
      row.documentId,
      row.grade,
      row.section,
      row.counts.PRESENT,
      row.counts.LATE_JUSTIFIED,
      row.counts.LATE_UNJUSTIFIED,
      row.counts.ABSENT_JUSTIFIED,
      row.counts.ABSENT_UNJUSTIFIED,
      `${row.attendanceRate}%`,
      evalStatus,
    ];
  });

  const legend1 = ['', 'LEYENDA OFICIAL SIAGIE MINEDU:'];
  const legend2 = [
    '',
    'P: Presente | FI: Falta Injustificada | FJ: Falta Justificada | TI: Tardanza Injustificada | TJ: Tardanza Justificada',
  ];
  const sig1 = ['', '', '', '_____________________________________'];
  const sig2 = ['', '', '', 'Firma y Sello del Director(a) de la I.E.'];

  const worksheetData = [
    title1,
    title2,
    title3,
    blankRow,
    headers,
    ...dataRows,
    blankRow,
    legend1,
    legend2,
    blankRow,
    blankRow,
    sig1,
    sig2,
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 38 },
    { wch: 15 },
    { wch: 8 },
    { wch: 9 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 22 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Acta_${periodText.replace(/\s+/g, '_')}`);
  XLSX.writeFile(workbook, `Acta_Resumen_Asistencia_${monthStr}.xlsx`);
}
