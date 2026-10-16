import { AttendanceMatrixStudentRow, AttendanceStatus } from '../types';

function formatMonthSpanish(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  const months = [
    'ENERO',
    'FEBRERO',
    'MARZO',
    'ABRIL',
    'MAYO',
    'JUNIO',
    'JULIO',
    'AGOSTO',
    'SETIEMBRE',
    'OCTUBRE',
    'NOVIEMBRE',
    'DICIEMBRE',
  ];
  return `${months[month - 1] || 'MES'} ${year}`;
}

function getDayInfo(year: number, month: number, day: number): { short: string; isWeekend: boolean; isSunday: boolean } {
  const date = new Date(year, month - 1, day);
  const dayIndex = date.getDay();
  const names = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  return {
    short: names[dayIndex],
    isWeekend: dayIndex === 0 || dayIndex === 6,
    isSunday: dayIndex === 0,
  };
}

function downloadFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface MarkedMatrixExportParams {
  students: AttendanceMatrixStudentRow[];
  monthStr: string;
  daysInMonth: number;
  classroomLabel?: string;
  schoolName?: string;
  mode: 'WITH_ATTENDANCE' | 'EMPTY';
}

/**
 * Exporta el Registro Auxiliar de Asistencia en formato Excel con cuadrícula
 * reforzada y bien marcada (1.5px solid #334155), optimizado para visualización
 * profesional e impresión física en orientación horizontal.
 * 
 * - 'WITH_ATTENDANCE': Contiene los alumnos matriculados del grado y sus asistencias del mes.
 * - 'EMPTY': Contiene 35 renglones numerados completamente vacíos para llenado manual.
 */
export function exportWellMarkedMatrixExcel(params: MarkedMatrixExportParams) {
  const {
    students,
    monthStr,
    daysInMonth,
    classroomLabel,
    schoolName = 'INSTITUCIÓN EDUCATIVA',
    mode,
  } = params;

  const [yearNum, monthNum] = monthStr.split('-').map(Number);
  const periodText = formatMonthSpanish(monthStr);

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const info = getDayInfo(yearNum, monthNum, day);
    return { day, ...info };
  });

  const isWithAttendance = mode === 'WITH_ATTENDANCE';
  const totalCols = 4 + daysInMonth + (isWithAttendance ? 5 : 5);

  // Filas a iterar: si es con asistencia usa los alumnos matriculados; si es vacía, 35 filas fijas
  const rowCount = isWithAttendance ? Math.max(students.length, 1) : 35;
  const rowIndexes = Array.from({ length: rowCount }, (_, i) => i);

  // Totales por día para el modo con asistencia
  const dailyTotals = days.map((d) => {
    let present = 0;
    let absent = 0;
    let late = 0;

    if (!d.isWeekend && isWithAttendance) {
      students.forEach((s) => {
        const st = s.dailyStatus[d.day];
        if (st === 'PRESENT') present++;
        else if (st === 'ABSENT_JUSTIFIED' || st === 'ABSENT_UNJUSTIFIED') absent++;
        else if (st === 'LATE_JUSTIFIED' || st === 'LATE_UNJUSTIFIED') late++;
      });
    }

    return { day: d.day, present, absent, late, isWeekend: d.isWeekend };
  });

  const sheetTitle = isWithAttendance
    ? `Asistencia_${classroomLabel || 'Grado'}_${monthStr}`
    : `Plantilla_Vacia_${monthStr}`;

  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>${sheetTitle.slice(0, 30)}</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
            <x:Print>
              <x:Orientation>Landscape</x:Orientation>
              <x:ValidPrinterInfo/>
            </x:Print>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 11px; color: #000000; }
    table { border-collapse: collapse; width: 100%; table-layout: fixed; }
    
    /* Cuadrícula bien marcada y reforzada (1.5px solid #334155) */
    th, td { border: 1.5px solid #334155; padding: 4px; text-align: center; vertical-align: middle; }
    
    .inst-header { background-color: #0f172a; color: #ffffff; font-size: 13px; font-weight: bold; text-align: center; padding: 8px; border: 1.5px solid #0f172a; }
    .sub-header { background-color: #334155; color: #ffffff; font-size: 11px; font-weight: bold; text-align: center; padding: 5px; border: 1.5px solid #0f172a; }
    .meta-bar { background-color: #f8fafc; color: #0f172a; font-size: 10px; font-weight: bold; text-align: left; padding: 6px 10px; border: 1.5px solid #334155; }
    
    .th-col { background-color: #1e293b; color: #ffffff; font-weight: bold; font-size: 10px; border: 1.5px solid #000000; }
    .th-day-num { background-color: #334155; color: #ffffff; font-size: 10px; font-weight: bold; border: 1.5px solid #000000; }
    .th-day-num.weekend { background-color: #94a3b8; color: #0f172a; }
    
    .th-summary { background-color: #0f766e; color: #ffffff; font-weight: bold; font-size: 9px; border: 1.5px solid #000000; }
    
    .row-num { font-weight: bold; background-color: #f1f5f9; color: #000000; border: 1.5px solid #334155; }
    .student-name { text-align: left; padding-left: 8px; font-weight: 600; color: #000000; white-space: nowrap; border: 1.5px solid #334155; }
    .doc-id { font-family: monospace; font-size: 10px; color: #000000; border: 1.5px solid #334155; }
    
    /* Casillas de día */
    .blank-cell { background-color: #ffffff; height: 24px; border: 1.5px solid #334155; }
    .weekend-blocked { background-color: #e2e8f0; color: #475569; font-weight: bold; font-size: 9px; border: 1.5px solid #334155; }
    
    /* Indicadores de colores dentro del cuadro bien marcado */
    .cell-p { background-color: #dcfce7; color: #166534; font-weight: bold; font-size: 10px; border: 1.5px solid #334155; }
    .cell-fi { background-color: #fee2e2; color: #991b1b; font-weight: bold; font-size: 10px; border: 1.5px solid #334155; }
    .cell-fj { background-color: #fef3c7; color: #92400e; font-weight: bold; font-size: 10px; border: 1.5px solid #334155; }
    .cell-ti { background-color: #ffedd5; color: #9a3412; font-weight: bold; font-size: 10px; border: 1.5px solid #334155; }
    .cell-tj { background-color: #e0f2fe; color: #075985; font-weight: bold; font-size: 10px; border: 1.5px solid #334155; }
    
    /* Totales */
    .tot-cell { font-weight: bold; font-size: 10px; border: 1.5px solid #334155; }
    .legend-box { font-size: 10px; border: 1.5px solid #334155; background-color: #f8fafc; padding: 6px; }
    .signature-line { border-top: 1.5px solid #000000; font-size: 10px; text-align: center; padding-top: 4px; font-weight: bold; }
  </style>
</head>
<body>
  <table>
    <!-- Encabezado Institucional -->
    <tr>
      <td colspan="${totalCols}" class="inst-header">
        REPÚBLICA DEL PERÚ • MINISTERIO DE EDUCACIÓN
      </td>
    </tr>
    <tr>
      <td colspan="${totalCols}" class="sub-header">
        ${
          isWithAttendance
            ? 'REGISTRO AUXILIAR MENSUAL DE ASISTENCIA Y PERMANENCIA ESCOLAR (SIAGIE)'
            : 'REGISTRO AUXILIAR DE CONTROL DIARIO DE ASISTENCIA (PLANTILLA PARA LLENADO MANUAL)'
        }
      </td>
    </tr>
    <tr>
      <td colspan="${totalCols}" class="meta-bar">
        I.E.: <strong>${schoolName.toUpperCase()}</strong> &nbsp;|&nbsp; 
        AULA / SECCIÓN: <strong>${(classroomLabel || (isWithAttendance ? 'TODAS LAS SECCIONES' : 'SECCIÓN AUXILIAR')).toUpperCase()}</strong> &nbsp;|&nbsp; 
        MES / AÑO: <strong>${periodText}</strong> &nbsp;|&nbsp; 
        ${
          isWithAttendance
            ? `ESTUDIANTES MATRICULADOS: <strong>${students.length} ALUMNOS</strong>`
            : 'PROFESOR(A) / TUTOR(A): _____________________________________'
        }
      </td>
    </tr>

    <!-- Cabecera de Columnas Fila 1 -->
    <tr>
      <th rowspan="2" class="th-col" style="width: 35px;">N°</th>
      <th rowspan="2" class="th-col" style="width: 270px; text-align: left; padding-left: 8px;">APELLIDOS Y NOMBRES DEL ESTUDIANTE</th>
      <th rowspan="2" class="th-col" style="width: 85px;">DNI</th>
      <th rowspan="2" class="th-col" style="width: 75px;">AULA</th>
      <th colspan="${daysInMonth}" class="th-col">
        ${
          isWithAttendance
            ? `DÍAS DEL MES (${periodText})`
            : `DÍAS DEL MES (${periodText}) - MARCAR: [ • / P ] Asistió &nbsp;|&nbsp; [ F ] Falta &nbsp;|&nbsp; [ T ] Tardanza`
        }
      </th>
      <th colspan="5" class="th-summary">
        ${isWithAttendance ? 'RESUMEN ACUMULADO DEL MES' : 'CONTEO FINAL DEL MES'}
      </th>
    </tr>

    <!-- Cabecera de Columnas Fila 2 -->
    <tr>
      ${days
        .map(
          (d) => `
        <th class="th-day-num ${d.isWeekend ? 'weekend' : ''}" style="width: 24px;">
          <div style="font-size: 8px;">${d.short}</div>
          <div>${String(d.day).padStart(2, '0')}</div>
        </th>`
        )
        .join('')}
      <th class="th-summary" style="width: 50px;">TOTAL<br/>ASIST. (P)</th>
      <th class="th-summary" style="width: 50px;">FALTAS<br/>JUST. (FJ)</th>
      <th class="th-summary" style="width: 50px;">FALTAS<br/>INJ. (FI)</th>
      <th class="th-summary" style="width: 50px;">TARD.<br/>(TI+TJ)</th>
      <th class="th-summary" style="width: 60px;">${isWithAttendance ? '% ASIST.' : 'FIRMA / OBS.'}</th>
    </tr>

    <!-- Filas de Estudiantes (con asistencias o casillas en blanco) -->
    ${rowIndexes
      .map((idx) => {
        const student = isWithAttendance && idx < students.length ? students[idx] : null;
        const studentName = student ? student.studentName.toUpperCase() : '';
        const documentId = student ? student.documentId : '';
        const classroom = student ? `${student.grade}° "${student.section}"` : classroomLabel || '';

        const dayCells = days
          .map((d) => {
            if (d.isWeekend) {
              return `<td class="weekend-blocked">${d.isSunday ? 'D' : 'S'}</td>`;
            }

            if (!isWithAttendance || !student) {
              return `<td class="blank-cell"></td>`;
            }

            const status: AttendanceStatus | undefined = student.dailyStatus[d.day];
            if (status === 'PRESENT') return `<td class="cell-p">P</td>`;
            if (status === 'ABSENT_UNJUSTIFIED') return `<td class="cell-fi">FI</td>`;
            if (status === 'ABSENT_JUSTIFIED') return `<td class="cell-fj">FJ</td>`;
            if (status === 'LATE_UNJUSTIFIED') return `<td class="cell-ti">TI</td>`;
            if (status === 'LATE_JUSTIFIED') return `<td class="cell-tj">TJ</td>`;
            return `<td class="blank-cell" style="color: #cbd5e1;">-</td>`;
          })
          .join('');

        if (isWithAttendance && student) {
          return `
          <tr>
            <td class="row-num">${idx + 1}</td>
            <td class="student-name">${studentName}</td>
            <td class="doc-id">${documentId}</td>
            <td style="font-size: 10px;">${classroom}</td>
            ${dayCells}
            <td class="tot-cell" style="background-color: #f0fdf4; color: #166534;">${student.counts.PRESENT}</td>
            <td class="tot-cell" style="background-color: #fffbeb; color: #92400e;">${student.counts.ABSENT_JUSTIFIED}</td>
            <td class="tot-cell" style="background-color: #fef2f2; color: #991b1b;">${student.counts.ABSENT_UNJUSTIFIED}</td>
            <td class="tot-cell" style="background-color: #fff7ed; color: #9a3412;">${student.counts.LATE_UNJUSTIFIED + student.counts.LATE_JUSTIFIED}</td>
            <td class="tot-cell" style="background-color: #f8fafc;">${student.attendanceRate}%</td>
          </tr>`;
        }

        // Fila en blanco para llenado manual
        return `
        <tr>
          <td class="row-num">${idx + 1}</td>
          <td class="student-name"></td>
          <td class="doc-id"></td>
          <td style="font-size: 10px;">${classroomLabel || ''}</td>
          ${dayCells}
          <td class="blank-cell"></td>
          <td class="blank-cell"></td>
          <td class="blank-cell"></td>
          <td class="blank-cell"></td>
          <td class="blank-cell"></td>
        </tr>`;
      })
      .join('')}

    <!-- Filas de Totales Diarios -->
    <tr style="background-color: #f1f5f9; font-weight: bold;">
      <td colspan="4" style="text-align: right; padding-right: 8px; border: 1.5px solid #334155;">ALUMNOS PRESENTES (Total por día):</td>
      ${dailyTotals
        .map((dt) =>
          dt.isWeekend
            ? `<td class="weekend-blocked"></td>`
            : `<td class="tot-cell" style="border: 1.5px solid #334155;">${isWithAttendance ? dt.present : ''}</td>`
        )
        .join('')}
      <td colspan="5" style="background-color: #e2e8f0; border: 1.5px solid #334155;"></td>
    </tr>
    <tr style="background-color: #f1f5f9; font-weight: bold;">
      <td colspan="4" style="text-align: right; padding-right: 8px; border: 1.5px solid #334155;">ALUMNOS AUSENTES (Total por día):</td>
      ${dailyTotals
        .map((dt) =>
          dt.isWeekend
            ? `<td class="weekend-blocked"></td>`
            : `<td class="tot-cell" style="border: 1.5px solid #334155;">${isWithAttendance ? dt.absent : ''}</td>`
        )
        .join('')}
      <td colspan="5" style="background-color: #e2e8f0; border: 1.5px solid #334155;"></td>
    </tr>
    ${
      isWithAttendance
        ? `
    <tr style="background-color: #f1f5f9; font-weight: bold;">
      <td colspan="4" style="text-align: right; padding-right: 8px; border: 1.5px solid #334155;">TARDANZAS (Total por día):</td>
      ${dailyTotals
        .map((dt) =>
          dt.isWeekend
            ? `<td class="weekend-blocked"></td>`
            : `<td class="tot-cell" style="border: 1.5px solid #334155;">${dt.late}</td>`
        )
        .join('')}
      <td colspan="5" style="background-color: #e2e8f0; border: 1.5px solid #334155;"></td>
    </tr>`
        : ''
    }

    <!-- Espacio separador -->
    <tr>
      <td colspan="${totalCols}" style="height: 12px; border: none; background-color: #ffffff;"></td>
    </tr>

    <!-- Leyenda Normativa -->
    <tr>
      <td colspan="${totalCols}" class="legend-box" style="text-align: left;">
        <strong>CÓDIGOS OFICIALES DE ASISTENCIA (MINEDU - SIAGIE):</strong> &nbsp;&nbsp;
        <span style="color: #166534; font-weight: bold;">[ P ]</span> Presente &nbsp;|&nbsp;
        <span style="color: #92400e; font-weight: bold;">[ FJ ]</span> Falta Justificada &nbsp;|&nbsp;
        <span style="color: #991b1b; font-weight: bold;">[ FI ]</span> Falta Injustificada &nbsp;|&nbsp;
        <span style="color: #9a3412; font-weight: bold;">[ TI ]</span> Tardanza Injustificada &nbsp;|&nbsp;
        <span style="color: #075985; font-weight: bold;">[ TJ ]</span> Tardanza Justificada &nbsp;|&nbsp;
        <strong>[ S / D ]</strong> Sábados y Domingos (Descanso Pedagógico)
      </td>
    </tr>

    <!-- Espacio para Firmas -->
    <tr>
      <td colspan="${totalCols}" style="height: 40px; border: none; background-color: #ffffff;"></td>
    </tr>
    <tr>
      <td colspan="3" style="border: none;"></td>
      <td colspan="10" class="signature-line">
        DOCENTE DE AULA / TUTOR(A)<br/>
        Firma y Sello
      </td>
      <td colspan="${totalCols - 26}" style="border: none;"></td>
      <td colspan="10" class="signature-line">
        DIRECCIÓN GENERAL / SUBDIRECCIÓN<br/>
        Firma y Sello Institucional
      </td>
      <td colspan="3" style="border: none;"></td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const safeClassroom = (classroomLabel || 'Aula').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = isWithAttendance
    ? `Registro_Asistencia_${safeClassroom}_${monthStr}.xls`
    : `Plantilla_Vacia_Control_Manual_${monthStr}.xls`;

  downloadFile(html, fileName, 'application/vnd.ms-excel');
}

// Mantener compatibilidad retroactiva por si se importa
export const exportBlankMatrixExcel = (params: any) => {
  exportWellMarkedMatrixExcel({
    ...params,
    mode: params.includeStudentNames ? 'WITH_ATTENDANCE' : 'EMPTY',
  });
};
export const exportMatrixColoredExcel = (params: any) => {
  exportWellMarkedMatrixExcel({
    ...params,
    mode: 'WITH_ATTENDANCE',
  });
};
