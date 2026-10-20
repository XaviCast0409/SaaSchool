import ExcelJS from 'exceljs';
import {
  ConsolidatedGradesReportData,
  MeritClassroomReportData,
  MeritGradeReportData,
  DraftRegisterReportData,
  ConductCommentsReportData,
  ClassroomRosterReportData,
  FamiliesByStateReportData,
  FamiliesChildrenReportData,
  FamiliesRelativesReportData,
  StudentBirthdaysReportData,
} from '../types';

// ============================================================================
// CONSTANTES Y ESTILOS INSTITUCIONALES (DISEÑO PREMIUM EJECUTIVO)
// ============================================================================

const PALETTE = {
  headerBg: 'FF1E3A8A',       // Azul Marino Institucional Oscuro
  headerText: 'FFFFFFFF',     // Blanco
  subHeaderBg: 'FFDBEAFE',    // Azul Hielo Suave (Ice Blue)
  subHeaderText: 'FF1E3A8A',  // Azul Marino
  infoBg: 'FFF8FAFC',         // Gris Pizarra Muy Suave
  infoText: 'FF334155',       // Pizarra Oscuro
  tableHeaderBg: 'FFF1F5F9',  // Fondo Cabecera Secundaria
  tableHeaderText: 'FF0F172A',
  zebraBg: 'FFF8FAFC',        // Cebra fila impar
  white: 'FFFFFFFF',
  borderLight: 'FFCBD5E1',    // Gris Borde Cuadrícula
  borderDark: 'FF94A3B8',     // Borde Cabeceras
  gradeFail: 'FFDC2626',      // Rojo para notas desaprobadas (< 10.5)
  gradePass: 'FF1E3A8A',      // Azul para notas aprobadas
  tercioSup: 'FF15803D',      // Verde Tercio Superior
  tercioMed: 'FFB45309',      // Ámbar Tercio Medio
  tercioInf: 'FF64748B',      // Pizarra Tercio Inferior
};

const BORDERS = {
  thin: {
    top: { style: 'thin' as const, color: { argb: PALETTE.borderLight } },
    left: { style: 'thin' as const, color: { argb: PALETTE.borderLight } },
    bottom: { style: 'thin' as const, color: { argb: PALETTE.borderLight } },
    right: { style: 'thin' as const, color: { argb: PALETTE.borderLight } },
  },
  header: {
    top: { style: 'thin' as const, color: { argb: PALETTE.borderDark } },
    left: { style: 'thin' as const, color: { argb: PALETTE.borderDark } },
    bottom: { style: 'medium' as const, color: { argb: PALETTE.headerBg } },
    right: { style: 'thin' as const, color: { argb: PALETTE.borderDark } },
  },
  doubleBottom: {
    top: { style: 'thin' as const, color: { argb: PALETTE.borderLight } },
    left: { style: 'thin' as const, color: { argb: PALETTE.borderLight } },
    bottom: { style: 'double' as const, color: { argb: PALETTE.tableHeaderText } },
    right: { style: 'thin' as const, color: { argb: PALETTE.borderLight } },
  },
};

/**
 * Obtiene la fecha y hora actual formateada según el estándar peruano de Cubicol
 */
const getFormattedDateTime = () => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return { dateStr, timeStr };
};

/**
 * Descarga en el navegador el libro Excel como archivo .xlsx nativo
 */
const saveWorkbook = async (workbook: ExcelJS.Workbook, filename: string): Promise<void> => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

/**
 * Combina un rango en la hoja garantizando que no sea degenerado o invertido
 */
const safeMerge = (
  ws: ExcelJS.Worksheet,
  top: number,
  left: number,
  bottom: number,
  right: number,
) => {
  if (top <= bottom && left <= right && (top !== bottom || left !== right)) {
    ws.mergeCells(top, left, bottom, right);
  }
};

/**
 * Aplica estilos en lote a un rango de celdas (incluso si está combinado)
 */
const styleRange = (
  ws: ExcelJS.Worksheet,
  top: number,
  left: number,
  bottom: number,
  right: number,
  style: {
    font?: Partial<ExcelJS.Font>;
    fill?: ExcelJS.Fill;
    border?: Partial<ExcelJS.Borders>;
    alignment?: Partial<ExcelJS.Alignment>;
    numFmt?: string;
  },
) => {
  for (let r = top; r <= bottom; r++) {
    for (let c = left; c <= right; c++) {
      const cell = ws.getCell(r, c);
      if (style.font) cell.font = { ...cell.font, ...style.font };
      if (style.fill) cell.fill = style.fill;
      if (style.border) cell.border = style.border;
      if (style.alignment) cell.alignment = { ...cell.alignment, ...style.alignment };
      if (style.numFmt) cell.numFmt = style.numFmt;
    }
  }
};

/**
 * Sanitiza números para evitar NaN, null o undefined en celdas de Excel
 */
const safeNumber = (val: unknown, decimals?: number): number | '' => {
  if (val === null || val === undefined || val === '') return '';
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return '';
  return decimals !== undefined ? Number(num.toFixed(decimals)) : num;
};

// ============================================================================
// REPORTE 0021: CONSOLIDADO DE NOTAS (Matriz Completa de Asignaturas)
// ============================================================================
export const exportConsolidatedGradesExcel = async (data: ConsolidatedGradesReportData): Promise<void> => {
  const { school, classroom, periodNumber, courses, students, courseStats, totalAttendances } = data;
  const { dateStr, timeStr } = getFormattedDateTime();
  const year = new Date().getFullYear();

  const wb = new ExcelJS.Workbook();
  wb.creator = 'SaaSchool Cloud Suite';
  wb.lastModifiedBy = 'SaaSchool Intranet';
  wb.created = new Date();

  const ws = wb.addWorksheet('Consolidado', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
  });

  const hasCourses = courses && courses.length > 0;
  const effectiveCourseCols = hasCourses ? courses.length : 1;
  const lastCol = 2 + effectiveCourseCols + 10;
  const colOffset = 2 + effectiveCourseCols;

  // 1. Encabezado Institucional
  ws.getCell(1, 1).value = school.name.toUpperCase();
  ws.getCell(1, 1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: PALETTE.headerBg } };

  ws.getCell(1, lastCol - 1).value = 'Fecha:';
  ws.getCell(1, lastCol - 1).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF64748B' } };
  ws.getCell(1, lastCol - 1).alignment = { horizontal: 'right' };
  ws.getCell(1, lastCol).value = dateStr;
  ws.getCell(1, lastCol).font = { name: 'Calibri', size: 9 };

  ws.getCell(2, 1).value = 'SaaSchool Intranet';
  ws.getCell(2, 1).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } };

  ws.getCell(2, lastCol - 1).value = 'Hora:';
  ws.getCell(2, lastCol - 1).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF64748B' } };
  ws.getCell(2, lastCol - 1).alignment = { horizontal: 'right' };
  ws.getCell(2, lastCol).value = timeStr;
  ws.getCell(2, lastCol).font = { name: 'Calibri', size: 9 };

  // 2. Título Central
  safeMerge(ws, 4, 3, 4, Math.max(3, lastCol - 2));
  const titleCell = ws.getCell(4, 3);
  titleCell.value = `CONSOLIDADO DE NOTAS - ${year}`;
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: PALETTE.headerBg } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(4).height = 24;

  // 3. Barra de Metadatos
  const infoRow = 6;
  ws.getRow(infoRow).height = 20;
  ws.getCell(infoRow, 1).value = 'Salón:';
  ws.getCell(infoRow, 1).font = { bold: true, size: 9, color: { argb: PALETTE.infoText } };
  ws.getCell(infoRow, 2).value = `${classroom.grade}° Grado ${classroom.section}`;
  ws.getCell(infoRow, 2).font = { bold: true, size: 10, color: { argb: PALETTE.headerBg } };

  ws.getCell(infoRow, 4).value = 'Periodo:';
  ws.getCell(infoRow, 4).font = { bold: true, size: 9, color: { argb: PALETTE.infoText } };
  ws.getCell(infoRow, 5).value = `${periodNumber}° Bimestre`;
  ws.getCell(infoRow, 5).font = { bold: true, size: 10, color: { argb: PALETTE.headerBg } };

  ws.getCell(infoRow, 7).value = 'Tutora:';
  ws.getCell(infoRow, 7).font = { bold: true, size: 9, color: { argb: PALETTE.infoText } };
  ws.getCell(infoRow, 8).value = classroom.tutorTeacher;
  ws.getCell(infoRow, 8).font = { bold: true, size: 9, color: { argb: PALETTE.tableHeaderText } };

  // 4. Cabecera Principal de la Tabla (Filas 7 y 8)
  ws.getRow(7).height = 22;
  ws.getRow(8).height = 26;

  // N°
  safeMerge(ws, 7, 1, 8, 1);
  ws.getCell(7, 1).value = 'N°';

  // APELLIDOS Y NOMBRES
  safeMerge(ws, 7, 2, 8, 2);
  ws.getCell(7, 2).value = 'APELLIDOS Y NOMBRES';

  // ASIGNATURAS
  if (hasCourses) {
    if (courses.length > 1) {
      safeMerge(ws, 7, 3, 7, 2 + courses.length);
    }
    ws.getCell(7, 3).value = 'ASIGNATURAS';
    courses.forEach((c, idx) => {
      const cell = ws.getCell(8, 3 + idx);
      cell.value = c.name;
      cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: PALETTE.subHeaderText } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.subHeaderBg } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = BORDERS.thin;
    });
  } else {
    safeMerge(ws, 7, 3, 8, 3);
    ws.getCell(7, 3).value = '(Sin Asignaturas)';
  }

  // Columnas Finales de Resumen
  const finalHeaders = [
    { label: 'CONDUCTA', col: colOffset + 1 },
    { label: 'PROMEDIO', col: colOffset + 2 },
    { label: 'PUNTAJE', col: colOffset + 3 },
    { label: 'N° DESAP.', col: colOffset + 4 },
    { label: 'ORDEN MÉRITO', col: colOffset + 5 },
    { label: 'TERCIO', col: colOffset + 6 },
    { label: 'Tardanza Injust.', col: colOffset + 7 },
    { label: 'Tardanza Just.', col: colOffset + 8 },
    { label: 'Falta Injust.', col: colOffset + 9 },
    { label: 'Falta Just.', col: colOffset + 10 },
  ];

  finalHeaders.forEach((h) => {
    safeMerge(ws, 7, h.col, 8, h.col);
    ws.getCell(7, h.col).value = h.label;
  });

  // Estilo general para toda la cabecera (Fila 7)
  styleRange(ws, 7, 1, 7, lastCol, {
    font: { name: 'Calibri', size: 9, bold: true, color: { argb: PALETTE.headerText } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerBg } },
    border: BORDERS.header,
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
  });

  // Asegurar bordes en celdas combinadas de la fila 8
  [1, 2, ...finalHeaders.map((h) => h.col)].forEach((c) => {
    ws.getCell(8, c).border = BORDERS.header;
  });

  // 5. Filas de Alumnos (Row 9 en adelante)
  let currentRow = 9;
  students.forEach((s) => {
    ws.getRow(currentRow).height = 19;
    const isEven = s.orderIndex % 2 === 0;
    const rowBg = isEven ? PALETTE.zebraBg : PALETTE.white;

    // Col 1: N°
    const cellNum = ws.getCell(currentRow, 1);
    cellNum.value = s.orderIndex;
    cellNum.alignment = { horizontal: 'center', vertical: 'middle' };

    // Col 2: Apellidos y Nombres
    const cellName = ws.getCell(currentRow, 2);
    cellName.value = s.fullName;
    cellName.font = { name: 'Calibri', size: 9.5, bold: false };
    cellName.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    // Cursos
    if (hasCourses) {
      courses.forEach((c, idx) => {
        const score = s.courseScores ? s.courseScores[c.id] : undefined;
        const cellScore = ws.getCell(currentRow, 3 + idx);
        const rounded = safeNumber(score);
        if (rounded !== '') {
          cellScore.value = Math.round(Number(rounded));
          cellScore.numFmt = '00';
          const isFailing = Number(rounded) < 10.5;
          cellScore.font = {
            name: 'Calibri',
            size: 9.5,
            bold: isFailing,
            color: { argb: isFailing ? PALETTE.gradeFail : PALETTE.gradePass },
          };
        } else {
          cellScore.value = '';
        }
        cellScore.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    } else {
      const cellEmpty = ws.getCell(currentRow, 3);
      cellEmpty.value = '-';
      cellEmpty.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Conducta
    const cellConduct = ws.getCell(currentRow, colOffset + 1);
    cellConduct.value = s.conduct;
    cellConduct.alignment = { horizontal: 'center', vertical: 'middle' };

    // Promedio (Destacado)
    const cellAvg = ws.getCell(currentRow, colOffset + 2);
    const avgNum = safeNumber(s.average, 1);
    if (avgNum !== '') {
      cellAvg.value = avgNum;
      cellAvg.numFmt = '0.0';
      const isFailingAvg = Number(avgNum) < 10.5;
      cellAvg.font = {
        name: 'Calibri',
        size: 9.5,
        bold: true,
        color: { argb: isFailingAvg ? PALETTE.gradeFail : PALETTE.gradePass },
      };
    } else {
      cellAvg.value = '';
    }
    cellAvg.alignment = { horizontal: 'center', vertical: 'middle' };

    // Puntaje
    const cellPoints = ws.getCell(currentRow, colOffset + 3);
    cellPoints.value = safeNumber(s.points);
    cellPoints.font = { name: 'Calibri', size: 9, bold: true };
    cellPoints.alignment = { horizontal: 'center', vertical: 'middle' };

    // N° Desaprobados
    const cellFailed = ws.getCell(currentRow, colOffset + 4);
    cellFailed.value = s.failedCoursesCount > 0 ? s.failedCoursesCount : '';
    if (s.failedCoursesCount > 0) {
      cellFailed.font = { name: 'Calibri', size: 9, bold: true, color: { argb: PALETTE.gradeFail } };
    }
    cellFailed.alignment = { horizontal: 'center', vertical: 'middle' };

    // Orden de Mérito
    const cellMerit = ws.getCell(currentRow, colOffset + 5);
    cellMerit.value = s.meritOrder ?? '';
    cellMerit.font = { name: 'Calibri', size: 9.5, bold: true };
    cellMerit.alignment = { horizontal: 'center', vertical: 'middle' };

    // Tercio
    const cellTercio = ws.getCell(currentRow, colOffset + 6);
    cellTercio.value = s.tercio ?? '';
    const tercioColor =
      s.tercio === 'SUP' ? PALETTE.tercioSup : s.tercio === 'MED' ? PALETTE.tercioMed : PALETTE.tercioInf;
    cellTercio.font = { name: 'Calibri', size: 9, bold: true, color: { argb: tercioColor } };
    cellTercio.alignment = { horizontal: 'center', vertical: 'middle' };

    // Asistencias
    const cellAtt1 = ws.getCell(currentRow, colOffset + 7);
    cellAtt1.value = s.attendance?.lateUnjustified || '';
    cellAtt1.alignment = { horizontal: 'center', vertical: 'middle' };

    const cellAtt2 = ws.getCell(currentRow, colOffset + 8);
    cellAtt2.value = s.attendance?.lateJustified || '';
    cellAtt2.alignment = { horizontal: 'center', vertical: 'middle' };

    const cellAtt3 = ws.getCell(currentRow, colOffset + 9);
    cellAtt3.value = s.attendance?.absentUnjustified || '';
    cellAtt3.alignment = { horizontal: 'center', vertical: 'middle' };

    const cellAtt4 = ws.getCell(currentRow, colOffset + 10);
    cellAtt4.value = s.attendance?.absentJustified || '';
    cellAtt4.alignment = { horizontal: 'center', vertical: 'middle' };

    // Aplicar bordes y fondo cebra a todas las celdas de la fila
    for (let col = 1; col <= lastCol; col++) {
      const c = ws.getCell(currentRow, col);
      c.border = BORDERS.thin;
      if (!c.fill) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      }
    }

    currentRow++;
  });

  // 6. Estadísticas Inferiores por Asignatura (Idéntico a Cubicol)
  currentRow++; // Fila vacía separadora

  const statLabels = [
    { label: 'Promedio del curso:', key: 'average', isDecimal: true },
    { label: 'N° de alumnos Aprobados:', key: 'approvedCount' },
    { label: 'N° de alumnos Desaprobados:', key: 'failedCount' },
    { label: '% de alumnos Aprobados:', key: 'approvedPercent', isPercent: true },
    { label: '% de alumnos Desaprobados:', key: 'failedPercent', isPercent: true },
    { label: 'Nota Máxima:', key: 'maxScore' },
    { label: 'Nota Mínima:', key: 'minScore' },
  ];

  statLabels.forEach((stat, sIdx) => {
    ws.getRow(currentRow).height = 18;
    safeMerge(ws, currentRow, 1, currentRow, 2);
    const labelCell = ws.getCell(currentRow, 1);
    labelCell.value = stat.label;
    labelCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: PALETTE.tableHeaderText } };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.tableHeaderBg } };
    labelCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    labelCell.border = sIdx === 6 ? BORDERS.doubleBottom : BORDERS.thin;
    ws.getCell(currentRow, 2).border = sIdx === 6 ? BORDERS.doubleBottom : BORDERS.thin;

    if (hasCourses) {
      courses.forEach((c, idx) => {
        const valCell = ws.getCell(currentRow, 3 + idx);
        const st = courseStats?.[c.id];
        const rawVal = st ? (st as unknown as Record<string, unknown>)[stat.key] : null;

        if (stat.isPercent) {
          valCell.value = rawVal !== null && rawVal !== undefined ? `${rawVal}%` : '';
        } else if (stat.isDecimal) {
          const num = safeNumber(rawVal, 1);
          valCell.value = num !== '' ? num : '';
          valCell.numFmt = '0.0';
        } else {
          valCell.value = safeNumber(rawVal);
        }

        valCell.font = { name: 'Calibri', size: 9, bold: true };
        valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.tableHeaderBg } };
        valCell.alignment = { horizontal: 'center', vertical: 'middle' };
        valCell.border = sIdx === 6 ? BORDERS.doubleBottom : BORDERS.thin;
      });
    } else {
      const valCell = ws.getCell(currentRow, 3);
      valCell.value = '-';
      valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.tableHeaderBg } };
      valCell.border = sIdx === 6 ? BORDERS.doubleBottom : BORDERS.thin;
    }

    // En la primera fila de estadísticas, incluir totales de asistencias
    if (sIdx === 0) {
      const attTotals = [
        totalAttendances?.lateUnjustified || '',
        totalAttendances?.lateJustified || '',
        totalAttendances?.absentUnjustified || '',
        totalAttendances?.absentJustified || '',
      ];
      attTotals.forEach((totalVal, aIdx) => {
        const cell = ws.getCell(currentRow, colOffset + 7 + aIdx);
        cell.value = totalVal;
        cell.font = { name: 'Calibri', size: 9, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.tableHeaderBg } };
        cell.border = BORDERS.thin;
      });
    }

    currentRow++;
  });

  // 7. Configuración de Columnas y Anchos Óptimos
  ws.getColumn(1).width = 5;   // N°
  ws.getColumn(2).width = 38;  // APELLIDOS Y NOMBRES
  if (hasCourses) {
    courses.forEach((_, idx) => {
      ws.getColumn(3 + idx).width = 15;
    });
  } else {
    ws.getColumn(3).width = 20;
  }
  ws.getColumn(colOffset + 1).width = 11; // Conducta
  ws.getColumn(colOffset + 2).width = 12; // Promedio
  ws.getColumn(colOffset + 3).width = 10; // Puntaje
  ws.getColumn(colOffset + 4).width = 14; // Desaprobados
  ws.getColumn(colOffset + 5).width = 15; // Orden Mérito
  ws.getColumn(colOffset + 6).width = 10; // Tercio
  ws.getColumn(colOffset + 7).width = 15; // T. Injust
  ws.getColumn(colOffset + 8).width = 15; // T. Just
  ws.getColumn(colOffset + 9).width = 14; // F. Injust
  ws.getColumn(colOffset + 10).width = 14; // F. Just

  // 8. Inmovilizar Paneles (Cabecera y Columnas N° y Alumnos fijas al hacer scroll)
  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 8 }];

  await saveWorkbook(wb, `0021_Consolidado_${classroom.grade}_${classroom.section}_B${periodNumber}.xlsx`);
};

// ============================================================================
// REPORTE 0048: ORDEN DE MÉRITO Y TERCIOS POR SALÓN
// ============================================================================
export const exportMeritClassroomExcel = async (data: MeritClassroomReportData): Promise<void> => {
  const { school, classroom, periodNumber, students, statistics } = data;
  const { dateStr, timeStr } = getFormattedDateTime();
  const year = new Date().getFullYear();

  const wb = new ExcelJS.Workbook();
  wb.creator = 'SaaSchool Cloud Suite';

  const ws = wb.addWorksheet('Merito_Salon', {
    pageSetup: {
      orientation: 'portrait',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
  });

  const lastCol = 10;

  // Encabezado
  ws.getCell(1, 1).value = school.name.toUpperCase();
  ws.getCell(1, 1).font = { bold: true, size: 11, color: { argb: PALETTE.headerBg } };
  ws.getCell(1, 9).value = 'Fecha:';
  ws.getCell(1, 9).font = { bold: true, size: 9, color: { argb: 'FF64748B' } };
  ws.getCell(1, 10).value = dateStr;

  ws.getCell(2, 1).value = 'SaaSchool Intranet';
  ws.getCell(2, 1).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
  ws.getCell(2, 9).value = 'Hora:';
  ws.getCell(2, 9).font = { bold: true, size: 9, color: { argb: 'FF64748B' } };
  ws.getCell(2, 10).value = timeStr;

  // Título
  safeMerge(ws, 3, 3, 3, 8);
  const tCell = ws.getCell(3, 3);
  tCell.value = 'REPORTE DE ORDEN DE MÉRITO Y TERCIOS POR SALÓN';
  tCell.font = { bold: true, size: 12, color: { argb: PALETTE.headerBg } };
  tCell.alignment = { horizontal: 'center' };

  safeMerge(ws, 4, 3, 4, 8);
  const subCell = ws.getCell(4, 3);
  subCell.value = `${periodNumber}° BIMESTRE ${year}`;
  subCell.font = { bold: true, size: 10, color: { argb: 'FF475569' } };
  subCell.alignment = { horizontal: 'center' };

  // Metadatos
  ws.getCell(5, 1).value = 'Salón:';
  ws.getCell(5, 1).font = { bold: true, size: 9 };
  ws.getCell(5, 2).value = `${classroom.grade}° Grado ${classroom.section}`;
  ws.getCell(5, 2).font = { bold: true, size: 10, color: { argb: PALETTE.headerBg } };

  ws.getCell(5, 4).value = `Tutor: ${classroom.tutorTeacher}`;
  ws.getCell(5, 4).font = { size: 9 };

  // Cabecera Principal (Filas 7 y 8)
  ws.getRow(7).height = 20;
  ws.getRow(8).height = 20;

  const colHeaders = [
    { label: 'Puesto', col: 1, spanV: true },
    { label: 'Apellidos y Nombres', col: 2, spanV: true },
    { label: 'Sexo', col: 3, spanV: true },
    { label: 'Promedio', col: 4, spanV: true },
    { label: 'Puntaje', col: 5, spanV: true },
    { label: '#Asignaturas', col: 6, spanH: 3 },
    { label: 'Conducta', col: 9, spanV: true },
    { label: 'Tercio', col: 10, spanV: true },
  ];

  colHeaders.forEach((h) => {
    if (h.spanV) {
      safeMerge(ws, 7, h.col, 8, h.col);
      ws.getCell(7, h.col).value = h.label;
    } else if (h.spanH) {
      safeMerge(ws, 7, h.col, 7, h.col + h.spanH - 1);
      ws.getCell(7, h.col).value = h.label;
    }
  });

  ws.getCell(8, 6).value = 'Aprob.';
  ws.getCell(8, 7).value = 'Desap.';
  ws.getCell(8, 8).value = 'SN';

  styleRange(ws, 7, 1, 8, lastCol, {
    font: { name: 'Calibri', size: 9, bold: true, color: { argb: PALETTE.headerText } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerBg } },
    border: BORDERS.header,
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  // Estilo subcabecera asignaturas
  [6, 7, 8].forEach((c) => {
    const cell = ws.getCell(8, c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.subHeaderBg } };
    cell.font = { name: 'Calibri', size: 8.5, bold: true, color: { argb: PALETTE.subHeaderText } };
    cell.border = BORDERS.thin;
  });

  // Alumnos
  let currentRow = 9;
  students.forEach((s) => {
    ws.getRow(currentRow).height = 19;
    const isEven = currentRow % 2 === 0;
    const rowBg = isEven ? PALETTE.zebraBg : PALETTE.white;

    const cellRank = ws.getCell(currentRow, 1);
    cellRank.value = s.rank ?? '';
    cellRank.font = { bold: true, size: 9.5 };
    cellRank.alignment = { horizontal: 'center', vertical: 'middle' };

    const cellName = ws.getCell(currentRow, 2);
    cellName.value = s.fullName;
    cellName.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    const cellGender = ws.getCell(currentRow, 3);
    cellGender.value = s.gender;
    cellGender.alignment = { horizontal: 'center', vertical: 'middle' };

    const cellAvg = ws.getCell(currentRow, 4);
    const avgNum = safeNumber(s.average, 2);
    cellAvg.value = avgNum !== '' ? avgNum : '';
    cellAvg.numFmt = '0.00';
    const isFailing = Number(avgNum) < 10.5;
    cellAvg.font = { bold: true, size: 9.5, color: { argb: isFailing ? PALETTE.gradeFail : PALETTE.gradePass } };
    cellAvg.alignment = { horizontal: 'center', vertical: 'middle' };

    const cellPts = ws.getCell(currentRow, 5);
    cellPts.value = safeNumber(s.points);
    cellPts.font = { bold: true };
    cellPts.alignment = { horizontal: 'center', vertical: 'middle' };

    const cellApp = ws.getCell(currentRow, 6);
    cellApp.value = s.approvedCoursesCount;
    cellApp.alignment = { horizontal: 'center', vertical: 'middle' };

    const cellFail = ws.getCell(currentRow, 7);
    cellFail.value = s.failedCoursesCount > 0 ? s.failedCoursesCount : '';
    if (s.failedCoursesCount > 0) {
      cellFail.font = { bold: true, color: { argb: PALETTE.gradeFail } };
    }
    cellFail.alignment = { horizontal: 'center', vertical: 'middle' };

    const cellSN = ws.getCell(currentRow, 8);
    cellSN.value = s.hasNoGrades ? 1 : '';
    cellSN.alignment = { horizontal: 'center', vertical: 'middle' };

    const cellCond = ws.getCell(currentRow, 9);
    cellCond.value = s.conduct;
    cellCond.alignment = { horizontal: 'center', vertical: 'middle' };

    const cellTercio = ws.getCell(currentRow, 10);
    cellTercio.value = s.tercio ?? '';
    const tercioColor =
      s.tercio === 'SUP' ? PALETTE.tercioSup : s.tercio === 'MED' ? PALETTE.tercioMed : PALETTE.tercioInf;
    cellTercio.font = { bold: true, color: { argb: tercioColor } };
    cellTercio.alignment = { horizontal: 'center', vertical: 'middle' };

    for (let c = 1; c <= lastCol; c++) {
      const cell = ws.getCell(currentRow, c);
      cell.border = BORDERS.thin;
      if (!cell.fill) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      }
    }

    currentRow++;
  });

  // Cuadros Resumen Inferiores (Idéntico a Cubicol)
  currentRow += 2;
  const summaryStart = currentRow;

  // Header Izquierdo: Cantidad de Alumnos
  safeMerge(ws, summaryStart, 2, summaryStart, 3);
  ws.getCell(summaryStart, 2).value = 'Cantidad de Alumnos';
  ws.getCell(summaryStart, 2).font = { bold: true, color: { argb: PALETTE.headerText } };
  ws.getCell(summaryStart, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerBg } };
  ws.getCell(summaryStart, 2).alignment = { horizontal: 'center' };

  // Header Derecho: Estadísticas Tercios
  safeMerge(ws, summaryStart, 5, summaryStart, 10);
  ws.getCell(summaryStart, 5).value = 'Estadísticas de Tercios';
  ws.getCell(summaryStart, 5).font = { bold: true, color: { argb: PALETTE.headerText } };
  ws.getCell(summaryStart, 5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerBg } };
  ws.getCell(summaryStart, 5).alignment = { horizontal: 'center' };

  // Subheader Tercios
  const subRow = summaryStart + 1;
  ws.getCell(subRow, 5).value = 'Tercio';
  ws.getCell(subRow, 6).value = 'Total';
  ws.getCell(subRow, 7).value = 'Porc.(%)';
  ws.getCell(subRow, 8).value = 'Rango Inicial';
  ws.getCell(subRow, 9).value = 'Rango Final';
  ws.getCell(subRow, 10).value = 'Prom.';
  styleRange(ws, subRow, 5, subRow, 10, {
    font: { bold: true, size: 8.5, color: { argb: PALETTE.subHeaderText } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.subHeaderBg } },
    alignment: { horizontal: 'center' },
    border: BORDERS.thin,
  });

  // Datos resumen
  const leftItems = [
    { label: 'Invictos:', val: statistics.studentCounts.invictos },
    { label: 'Con asignaturas desaprobadas:', val: statistics.studentCounts.withFailed },
    { label: 'Con SN:', val: statistics.studentCounts.withoutGrades },
    { label: 'Con notas en blanco:', val: statistics.studentCounts.blankGrades },
    { label: 'Retirados:', val: statistics.studentCounts.withdrawn },
    { label: 'Total de Alumnos:', val: statistics.studentCounts.total },
  ];

  const terciosList = [
    { label: 'Tercio Superior:', t: statistics.tercios.superior },
    { label: 'Tercio Medio:', t: statistics.tercios.medio },
    { label: 'Tercio Inferior:', t: statistics.tercios.inferior },
  ];

  leftItems.forEach((item, idx) => {
    const r = subRow + 1 + idx;
    ws.getCell(r, 2).value = item.label;
    ws.getCell(r, 2).font = { bold: idx === 5, size: 9 };
    ws.getCell(r, 3).value = item.val;
    ws.getCell(r, 3).font = { bold: idx === 5, size: 9 };
    ws.getCell(r, 3).alignment = { horizontal: 'center' };
    ws.getCell(r, 2).border = BORDERS.thin;
    ws.getCell(r, 3).border = BORDERS.thin;

    // Lado derecho correspondiente
    if (idx < 3) {
      const ter = terciosList[idx].t;
      ws.getCell(r, 5).value = terciosList[idx].label;
      ws.getCell(r, 6).value = ter?.total ?? 0;
      ws.getCell(r, 7).value = ter?.percent ? `${ter.percent}%` : '0%';
      ws.getCell(r, 8).value = ter?.initialScore ?? '-';
      ws.getCell(r, 9).value = ter?.finalScore ?? '-';
      ws.getCell(r, 10).value = ter?.average ? safeNumber(ter.average, 2) : '-';

      for (let c = 5; c <= 10; c++) {
        ws.getCell(r, c).border = BORDERS.thin;
        ws.getCell(r, c).alignment = { horizontal: 'center' };
      }
    } else if (idx === 3) {
      const ter = statistics.tercios.withoutTercio;
      ws.getCell(r, 5).value = 'Sin Tercio:';
      ws.getCell(r, 6).value = ter?.total ?? 0;
      ws.getCell(r, 7).value = ter?.percent ? `${ter.percent}%` : '0%';
      ws.getCell(r, 8).value = '-';
      ws.getCell(r, 9).value = '-';
      ws.getCell(r, 10).value = '-';

      for (let c = 5; c <= 10; c++) {
        ws.getCell(r, c).border = BORDERS.thin;
        ws.getCell(r, c).alignment = { horizontal: 'center' };
      }
    } else if (idx === 4) {
      safeMerge(ws, r, 5, r, 6);
      ws.getCell(r, 5).value = 'Promedio del salón:';
      ws.getCell(r, 5).font = { bold: true };
      ws.getCell(r, 7).value = safeNumber(statistics.classroomAverage, 2);
      ws.getCell(r, 7).font = { bold: true };

      safeMerge(ws, r, 8, r, 10);
      ws.getCell(r, 8).value = `Nota Mayor: ${statistics.maxScore}  |  Menor: ${statistics.minScore}`;
      ws.getCell(r, 8).font = { size: 8.5, italic: true };
      for (let c = 5; c <= 10; c++) ws.getCell(r, c).border = BORDERS.thin;
    }
  });

  // Anchos de columna
  ws.getColumn(1).width = 7;   // Puesto
  ws.getColumn(2).width = 36;  // Apellidos
  ws.getColumn(3).width = 10;  // Sexo
  ws.getColumn(4).width = 12;  // Promedio
  ws.getColumn(5).width = 10;  // Puntaje
  ws.getColumn(6).width = 9;   // Aprob
  ws.getColumn(7).width = 9;   // Desap
  ws.getColumn(8).width = 8;   // SN
  ws.getColumn(9).width = 11;  // Conducta
  ws.getColumn(10).width = 12; // Tercio

  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 8 }];

  await saveWorkbook(wb, `0048_Merito_${classroom.grade}_${classroom.section}_B${periodNumber}.xlsx`);
};

// ============================================================================
// REPORTE 0049: ORDEN DE MÉRITO Y TERCIOS POR GRADO
// ============================================================================
export const exportMeritGradeExcel = async (data: MeritGradeReportData): Promise<void> => {
  const { school, educationLevel, grade, periodNumber, students, statistics } = data;
  const { dateStr, timeStr } = getFormattedDateTime();
  const year = new Date().getFullYear();

  const wb = new ExcelJS.Workbook();
  wb.creator = 'SaaSchool Cloud Suite';

  const ws = wb.addWorksheet('Merito_Grado', {
    pageSetup: {
      orientation: 'portrait',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
  });

  const lastCol = 12;

  ws.getCell(1, 1).value = school.name.toUpperCase();
  ws.getCell(1, 1).font = { bold: true, size: 11, color: { argb: PALETTE.headerBg } };
  ws.getCell(1, lastCol - 1).value = 'Fecha:';
  ws.getCell(1, lastCol).value = dateStr;

  ws.getCell(2, 1).value = 'SaaSchool Intranet';
  ws.getCell(2, 1).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
  ws.getCell(2, lastCol - 1).value = 'Hora:';
  ws.getCell(2, lastCol).value = timeStr;

  safeMerge(ws, 3, 3, 3, lastCol - 2);
  const tCell = ws.getCell(3, 3);
  tCell.value = 'REPORTE DE ORDEN DE MÉRITO Y TERCIOS POR GRADO';
  tCell.font = { bold: true, size: 12, color: { argb: PALETTE.headerBg } };
  tCell.alignment = { horizontal: 'center' };

  safeMerge(ws, 4, 3, 4, lastCol - 2);
  const subCell = ws.getCell(4, 3);
  subCell.value = `${periodNumber}° BIMESTRE ${year} | Nivel: ${educationLevel} - ${grade}° Grado`;
  subCell.font = { bold: true, size: 9.5, color: { argb: 'FF475569' } };
  subCell.alignment = { horizontal: 'center' };

  // Cabecera Principal
  ws.getRow(7).height = 20;
  ws.getRow(8).height = 20;

  const headers = [
    { label: 'Puesto', col: 1, spanV: true },
    { label: 'Apellidos y Nombres', col: 2, spanV: true },
    { label: 'Sexo', col: 3, spanV: true },
    { label: 'Sección', col: 4, spanV: true },
    { label: 'Promedio', col: 5, spanV: true },
    { label: 'Puntaje', col: 6, spanV: true },
    { label: '#Asignaturas', col: 7, spanH: 3 },
    { label: 'Conducta', col: 10, spanV: true },
    { label: 'Tercio', col: 11, spanV: true },
    { label: 'Quinto', col: 12, spanV: true },
  ];

  headers.forEach((h) => {
    if (h.spanV) {
      safeMerge(ws, 7, h.col, 8, h.col);
      ws.getCell(7, h.col).value = h.label;
    } else if (h.spanH) {
      safeMerge(ws, 7, h.col, 7, h.col + h.spanH - 1);
      ws.getCell(7, h.col).value = h.label;
    }
  });

  ws.getCell(8, 7).value = 'Aprob.';
  ws.getCell(8, 8).value = 'Desap.';
  ws.getCell(8, 9).value = 'SN';

  styleRange(ws, 7, 1, 8, lastCol, {
    font: { name: 'Calibri', size: 9, bold: true, color: { argb: PALETTE.headerText } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerBg } },
    border: BORDERS.header,
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  [7, 8, 9].forEach((c) => {
    const cell = ws.getCell(8, c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.subHeaderBg } };
    cell.font = { name: 'Calibri', size: 8.5, bold: true, color: { argb: PALETTE.subHeaderText } };
    cell.border = BORDERS.thin;
  });

  let currentRow = 9;
  students.forEach((s) => {
    ws.getRow(currentRow).height = 19;
    const isEven = currentRow % 2 === 0;
    const rowBg = isEven ? PALETTE.zebraBg : PALETTE.white;

    ws.getCell(currentRow, 1).value = s.rank ?? '';
    ws.getCell(currentRow, 1).alignment = { horizontal: 'center' };
    ws.getCell(currentRow, 1).font = { bold: true };

    ws.getCell(currentRow, 2).value = s.fullName;
    ws.getCell(currentRow, 2).alignment = { horizontal: 'left', indent: 1 };

    ws.getCell(currentRow, 3).value = s.gender;
    ws.getCell(currentRow, 3).alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 4).value = s.section;
    ws.getCell(currentRow, 4).alignment = { horizontal: 'center' };
    ws.getCell(currentRow, 4).font = { bold: true };

    const cellAvg = ws.getCell(currentRow, 5);
    const avgNum = safeNumber(s.average, 2);
    cellAvg.value = avgNum !== '' ? avgNum : '';
    cellAvg.numFmt = '0.00';
    const isFailing = Number(avgNum) < 10.5;
    cellAvg.font = { bold: true, color: { argb: isFailing ? PALETTE.gradeFail : PALETTE.gradePass } };
    cellAvg.alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 6).value = safeNumber(s.points);
    ws.getCell(currentRow, 6).alignment = { horizontal: 'center' };
    ws.getCell(currentRow, 6).font = { bold: true };

    ws.getCell(currentRow, 7).value = s.approvedCoursesCount;
    ws.getCell(currentRow, 7).alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 8).value = s.failedCoursesCount > 0 ? s.failedCoursesCount : '';
    if (s.failedCoursesCount > 0) {
      ws.getCell(currentRow, 8).font = { bold: true, color: { argb: PALETTE.gradeFail } };
    }
    ws.getCell(currentRow, 8).alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 9).value = s.hasNoGrades ? 1 : '';
    ws.getCell(currentRow, 9).alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 10).value = s.conduct;
    ws.getCell(currentRow, 10).alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 11).value = s.tercio ?? '';
    ws.getCell(currentRow, 11).font = { bold: true, color: { argb: s.tercio === 'SUP' ? PALETTE.tercioSup : PALETTE.tercioInf } };
    ws.getCell(currentRow, 11).alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 12).value = s.quinto ?? '';
    ws.getCell(currentRow, 12).font = { bold: true };
    ws.getCell(currentRow, 12).alignment = { horizontal: 'center' };

    for (let c = 1; c <= lastCol; c++) {
      const cell = ws.getCell(currentRow, c);
      cell.border = BORDERS.thin;
      if (!cell.fill) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      }
    }

    currentRow++;
  });

  // Cuadros Resumen Inferiores para Grado (Idéntico a Cubicol)
  currentRow += 2;
  const summaryStart = currentRow;

  // Header Izquierdo: Cantidad de Alumnos
  safeMerge(ws, summaryStart, 2, summaryStart, 3);
  ws.getCell(summaryStart, 2).value = 'Cantidad de Alumnos';
  ws.getCell(summaryStart, 2).font = { bold: true, color: { argb: PALETTE.headerText } };
  ws.getCell(summaryStart, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerBg } };
  ws.getCell(summaryStart, 2).alignment = { horizontal: 'center' };

  // Header Derecho: Estadísticas Tercios
  safeMerge(ws, summaryStart, 5, summaryStart, 12);
  ws.getCell(summaryStart, 5).value = 'Estadísticas de Tercios del Grado';
  ws.getCell(summaryStart, 5).font = { bold: true, color: { argb: PALETTE.headerText } };
  ws.getCell(summaryStart, 5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerBg } };
  ws.getCell(summaryStart, 5).alignment = { horizontal: 'center' };

  const subRow = summaryStart + 1;
  ws.getCell(subRow, 5).value = 'Tercio';
  ws.getCell(subRow, 6).value = 'Total';
  ws.getCell(subRow, 7).value = 'Porc.(%)';
  safeMerge(ws, subRow, 8, subRow, 9);
  ws.getCell(subRow, 8).value = 'Rango Promedio';
  safeMerge(ws, subRow, 10, subRow, 12);
  ws.getCell(subRow, 10).value = 'Prom.';

  styleRange(ws, subRow, 5, subRow, 12, {
    font: { bold: true, size: 8.5, color: { argb: PALETTE.subHeaderText } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.subHeaderBg } },
    alignment: { horizontal: 'center' },
    border: BORDERS.thin,
  });

  const leftItems = [
    { label: 'Invictos:', val: statistics.studentCounts.invictos },
    { label: 'Con asignaturas desaprobadas:', val: statistics.studentCounts.withFailed },
    { label: 'Con SN:', val: statistics.studentCounts.withoutGrades },
    { label: 'Con notas en blanco:', val: statistics.studentCounts.blankGrades },
    { label: 'Retirados:', val: statistics.studentCounts.withdrawn },
    { label: 'Total de Alumnos:', val: statistics.studentCounts.total },
  ];

  const rightItems = [
    { label: 'Tercio Superior:', t: statistics.tercios.superior },
    { label: 'Tercio Medio:', t: statistics.tercios.medio },
    { label: 'Tercio Inferior:', t: statistics.tercios.inferior },
  ];

  leftItems.forEach((item, idx) => {
    const r = subRow + 1 + idx;
    ws.getCell(r, 2).value = item.label;
    ws.getCell(r, 2).font = { bold: idx === 5, size: 9 };
    ws.getCell(r, 3).value = item.val;
    ws.getCell(r, 3).font = { bold: idx === 5, size: 9 };
    ws.getCell(r, 3).alignment = { horizontal: 'center' };
    ws.getCell(r, 2).border = BORDERS.thin;
    ws.getCell(r, 3).border = BORDERS.thin;

    if (idx < 3) {
      const ter = rightItems[idx].t;
      ws.getCell(r, 5).value = rightItems[idx].label;
      ws.getCell(r, 6).value = ter?.total ?? 0;
      ws.getCell(r, 7).value = ter?.percent ? `${ter.percent}%` : '0%';
      safeMerge(ws, r, 8, r, 9);
      ws.getCell(r, 8).value = `${ter?.initialScore ?? '-'} a ${ter?.finalScore ?? '-'}`;
      safeMerge(ws, r, 10, r, 12);
      ws.getCell(r, 10).value = ter?.average ? safeNumber(ter.average, 2) : '-';

      for (let c = 5; c <= 12; c++) {
        ws.getCell(r, c).border = BORDERS.thin;
        ws.getCell(r, c).alignment = { horizontal: 'center' };
      }
    } else if (idx === 3) {
      ws.getCell(r, 5).value = 'Sin Tercio:';
      ws.getCell(r, 6).value = statistics.tercios.withoutTercio?.total ?? 0;
      ws.getCell(r, 7).value = statistics.tercios.withoutTercio?.percent ? `${statistics.tercios.withoutTercio.percent}%` : '0%';
      safeMerge(ws, r, 8, r, 9);
      ws.getCell(r, 8).value = '-';
      safeMerge(ws, r, 10, r, 12);
      ws.getCell(r, 10).value = '-';
      for (let c = 5; c <= 12; c++) {
        ws.getCell(r, c).border = BORDERS.thin;
        ws.getCell(r, c).alignment = { horizontal: 'center' };
      }
    } else if (idx === 4) {
      safeMerge(ws, r, 5, r, 6);
      ws.getCell(r, 5).value = 'Promedio del grado:';
      ws.getCell(r, 5).font = { bold: true };
      ws.getCell(r, 7).value = safeNumber(statistics.gradeAverage, 2);
      ws.getCell(r, 7).font = { bold: true };

      safeMerge(ws, r, 8, r, 12);
      ws.getCell(r, 8).value = `Nota Mayor: ${statistics.maxScore}  |  Menor: ${statistics.minScore}`;
      ws.getCell(r, 8).font = { size: 8.5, italic: true };
      for (let c = 5; c <= 12; c++) ws.getCell(r, c).border = BORDERS.thin;
    }
  });

  // Anchos
  ws.getColumn(1).width = 7;
  ws.getColumn(2).width = 36;
  ws.getColumn(3).width = 8;
  ws.getColumn(4).width = 9;
  ws.getColumn(5).width = 11;
  ws.getColumn(6).width = 9;
  ws.getColumn(7).width = 8;
  ws.getColumn(8).width = 8;
  ws.getColumn(9).width = 8;
  ws.getColumn(10).width = 10;
  ws.getColumn(11).width = 11;
  ws.getColumn(12).width = 11;

  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 8 }];

  await saveWorkbook(wb, `0049_Merito_Grado_${educationLevel}_${grade}_B${periodNumber}.xlsx`);
};

// ============================================================================
// REPORTE 0041: REGISTRO AUXILIAR BORRADOR
// ============================================================================
export const exportDraftRegisterExcel = async (data: DraftRegisterReportData): Promise<void> => {
  const { school, classroom, course, students, blankCriteriaColumnsCount = 20 } = data;
  const { dateStr, timeStr } = getFormattedDateTime();
  const year = new Date().getFullYear();

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Borrador', {
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1 },
  });

  const totalCols = 2 + blankCriteriaColumnsCount;

  ws.getCell(1, 1).value = school.name.toUpperCase();
  ws.getCell(1, 1).font = { bold: true, size: 11, color: { argb: PALETTE.headerBg } };
  ws.getCell(1, totalCols - 1).value = 'Fecha:';
  ws.getCell(1, totalCols).value = dateStr;

  ws.getCell(2, 1).value = 'SaaSchool Intranet';
  ws.getCell(2, 1).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
  ws.getCell(2, totalCols - 1).value = 'Hora:';
  ws.getCell(2, totalCols).value = timeStr;

  safeMerge(ws, 3, 3, 3, Math.max(3, totalCols - 2));
  const tCell = ws.getCell(3, 3);
  tCell.value = `REGISTRO AUXILIAR BORRADOR - ${year}`;
  tCell.font = { bold: true, size: 13, color: { argb: PALETTE.headerBg } };
  tCell.alignment = { horizontal: 'center' };

  ws.getCell(5, 1).value = `Salón: ${classroom.grade}° Grado ${classroom.section}`;
  ws.getCell(5, 1).font = { bold: true };
  ws.getCell(5, 4).value = `Curso: ${course ? course.name : '________________________'}`;
  ws.getCell(5, 7).value = `Docente: ${course ? course.teacherName : '________________________'}`;

  // Cabecera Cuadrícula
  ws.getRow(7).height = 22;
  ws.getRow(8).height = 24;

  safeMerge(ws, 7, 1, 8, 1);
  ws.getCell(7, 1).value = 'N°';

  safeMerge(ws, 7, 2, 8, 2);
  ws.getCell(7, 2).value = 'APELLIDOS Y NOMBRES';

  safeMerge(ws, 7, 3, 7, totalCols);
  ws.getCell(7, 3).value = 'CRITERIOS DE EVALUACIÓN / TAREAS / EXÁMENES';

  styleRange(ws, 7, 1, 7, totalCols, {
    font: { name: 'Calibri', size: 9.5, bold: true, color: { argb: PALETTE.headerText } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerBg } },
    border: BORDERS.header,
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  for (let c = 3; c <= totalCols; c++) {
    const cell = ws.getCell(8, c);
    cell.value = `C${c - 2}`;
    cell.font = { size: 8, bold: true, color: { argb: PALETTE.subHeaderText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.subHeaderBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = BORDERS.thin;
  }
  ws.getCell(8, 1).border = BORDERS.header;
  ws.getCell(8, 2).border = BORDERS.header;

  // Filas amplias para anotaciones a mano o digitales
  let currentRow = 9;
  students.forEach((s) => {
    ws.getRow(currentRow).height = 22;
    ws.getCell(currentRow, 1).value = s.index;
    ws.getCell(currentRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.getCell(currentRow, 2).value = s.fullName;
    ws.getCell(currentRow, 2).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    for (let c = 1; c <= totalCols; c++) {
      ws.getCell(currentRow, c).border = BORDERS.thin;
    }
    currentRow++;
  });

  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 38;
  for (let c = 3; c <= totalCols; c++) {
    ws.getColumn(c).width = 4.8;
  }

  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 8 }];

  await saveWorkbook(wb, `0041_Borrador_${classroom.grade}_${classroom.section}.xlsx`);
};

// ============================================================================
// REPORTE 0030: CONDUCTA Y COMENTARIOS
// ============================================================================
export const exportConductCommentsExcel = async (data: ConductCommentsReportData): Promise<void> => {
  const { school, classroom, periodNumber, students } = data;
  const { dateStr, timeStr } = getFormattedDateTime();
  const year = new Date().getFullYear();

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Conducta', {
    pageSetup: { orientation: 'portrait', paperSize: 9, fitToPage: true, fitToWidth: 1 },
  });

  ws.getCell(1, 1).value = school.name.toUpperCase();
  ws.getCell(1, 1).font = { bold: true, size: 11, color: { argb: PALETTE.headerBg } };
  ws.getCell(1, 3).value = 'Fecha:';
  ws.getCell(1, 4).value = dateStr;

  ws.getCell(2, 1).value = 'SaaSchool Intranet';
  ws.getCell(2, 1).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
  ws.getCell(2, 3).value = 'Hora:';
  ws.getCell(2, 4).value = timeStr;

  safeMerge(ws, 3, 2, 3, 4);
  const tCell = ws.getCell(3, 2);
  tCell.value = `REPORTE DE CONDUCTA Y COMENTARIOS - ${year}`;
  tCell.font = { bold: true, size: 12, color: { argb: PALETTE.headerBg } };
  tCell.alignment = { horizontal: 'center' };

  ws.getCell(5, 1).value = `Salón: ${classroom.grade}° Grado ${classroom.section}`;
  ws.getCell(5, 1).font = { bold: true };
  ws.getCell(5, 2).value = `Tutor: ${classroom.tutorTeacher}`;
  ws.getCell(5, 4).value = `Bimestre: ${periodNumber}`;

  // Cabecera
  ws.getRow(7).height = 22;
  const headers = ['Código', 'Nombre del Alumno', 'Conducta', 'Firma y Fecha'];
  headers.forEach((h, idx) => {
    const cell = ws.getCell(7, idx + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: PALETTE.headerText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerBg } };
    cell.alignment = { horizontal: idx === 1 ? 'left' : 'center', vertical: 'middle', indent: idx === 1 ? 1 : 0 };
    cell.border = BORDERS.header;
  });

  let currentRow = 8;
  students.forEach((s) => {
    // Fila 1: Datos principales
    ws.getRow(currentRow).height = 20;
    ws.getCell(currentRow, 1).value = s.studentCode || `A${year}${String(s.index).padStart(5, '0')}`;
    ws.getCell(currentRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(currentRow, 1).font = { bold: true };

    ws.getCell(currentRow, 2).value = s.fullName;
    ws.getCell(currentRow, 2).font = { bold: true };
    ws.getCell(currentRow, 2).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    ws.getCell(currentRow, 3).value = s.conductScore;
    ws.getCell(currentRow, 3).font = { bold: true, color: { argb: PALETTE.headerBg } };
    ws.getCell(currentRow, 3).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.getCell(currentRow, 4).value = '';

    for (let c = 1; c <= 4; c++) ws.getCell(currentRow, c).border = BORDERS.thin;
    currentRow++;

    // Fila 2: Comentario y Sello del Tutor (Idéntico a captura 5 de Cubicol)
    ws.getRow(currentRow).height = 26;
    ws.getCell(currentRow, 1).value = '';

    ws.getCell(currentRow, 2).value = s.comments || 'Sin comentarios registrados.';
    ws.getCell(currentRow, 2).font = { italic: true, size: 9, color: { argb: 'FF475569' } };
    ws.getCell(currentRow, 2).alignment = { horizontal: 'left', vertical: 'middle', indent: 2, wrapText: true };

    ws.getCell(currentRow, 3).value = '';

    ws.getCell(currentRow, 4).value = `${classroom.tutorTeacher ? classroom.tutorTeacher.split(' ')[0] : 'Docente'} | ${dateStr} ${timeStr}`;
    ws.getCell(currentRow, 4).font = { size: 8, color: { argb: 'FF64748B' } };
    ws.getCell(currentRow, 4).alignment = { horizontal: 'center', vertical: 'middle' };

    for (let c = 1; c <= 4; c++) {
      const cell = ws.getCell(currentRow, c);
      cell.border = {
        bottom: { style: 'medium', color: { argb: PALETTE.headerBg } },
        left: { style: 'thin', color: { argb: PALETTE.borderLight } },
        right: { style: 'thin', color: { argb: PALETTE.borderLight } },
      };
    }
    currentRow++;
  });

  ws.getColumn(1).width = 16;
  ws.getColumn(2).width = 46;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 30;

  await saveWorkbook(wb, `0030_Conducta_${classroom.grade}_${classroom.section}_B${periodNumber}.xlsx`);
};


// ============================================================================
// REPORTE 0011: PADRÓN OFICIAL DE ALUMNOS POR SALÓN
// ============================================================================
export const exportClassroomRosterExcel = async (data: ClassroomRosterReportData): Promise<void> => {
  const { school, classroom, students, totalStudents } = data;
  const { dateStr, timeStr } = getFormattedDateTime();

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Padron', {
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1 },
  });

  const lastCol = 9;

  ws.getCell(1, 1).value = school.name.toUpperCase();
  ws.getCell(1, 1).font = { bold: true, size: 11, color: { argb: PALETTE.headerBg } };
  ws.getCell(1, lastCol - 1).value = 'Fecha:';
  ws.getCell(1, lastCol).value = dateStr;

  ws.getCell(2, 1).value = 'SaaSchool Intranet';
  ws.getCell(2, 1).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
  ws.getCell(2, lastCol - 1).value = 'Hora:';
  ws.getCell(2, lastCol).value = timeStr;

  safeMerge(ws, 3, 3, 3, lastCol - 2);
  const tCell = ws.getCell(3, 3);
  tCell.value = 'PADRÓN OFICIAL DE ALUMNOS POR SALÓN';
  tCell.font = { bold: true, size: 13, color: { argb: PALETTE.headerBg } };
  tCell.alignment = { horizontal: 'center' };

  ws.getCell(5, 1).value = `Salón: ${classroom.grade}° Grado ${classroom.section}`;
  ws.getCell(5, 1).font = { bold: true };
  ws.getCell(5, 3).value = `Turno: ${classroom.shift}`;
  ws.getCell(5, 5).value = `Tutor: ${classroom.tutorTeacher}`;
  ws.getCell(5, 8).value = `Total Matriculados: ${totalStudents}`;
  ws.getCell(5, 8).font = { bold: true, color: { argb: PALETTE.headerBg } };

  const headers = [
    'N°',
    'Cód. Estudiante',
    'DNI / Doc',
    'Apellidos y Nombres',
    'Sexo',
    'F. Nacimiento',
    'Estado',
    'Apoderado Legal',
    'Teléfono',
  ];

  ws.getRow(7).height = 22;
  headers.forEach((h, idx) => {
    const cell = ws.getCell(7, idx + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: PALETTE.headerText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerBg } };
    cell.alignment = { horizontal: idx === 3 || idx === 7 ? 'left' : 'center', vertical: 'middle', indent: idx === 3 || idx === 7 ? 1 : 0 };
    cell.border = BORDERS.header;
  });

  let currentRow = 8;
  students.forEach((s) => {
    ws.getRow(currentRow).height = 19;
    const isEven = currentRow % 2 === 0;
    const rowBg = isEven ? PALETTE.zebraBg : PALETTE.white;

    ws.getCell(currentRow, 1).value = s.index;
    ws.getCell(currentRow, 1).alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 2).value = s.studentCode || '';
    ws.getCell(currentRow, 2).alignment = { horizontal: 'center' };
    ws.getCell(currentRow, 2).font = { bold: true };

    ws.getCell(currentRow, 3).value = s.documentId || '';
    ws.getCell(currentRow, 3).alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 4).value = s.fullName;
    ws.getCell(currentRow, 4).alignment = { horizontal: 'left', indent: 1 };

    ws.getCell(currentRow, 5).value = s.gender || '';
    ws.getCell(currentRow, 5).alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 6).value = s.birthDate || '';
    ws.getCell(currentRow, 6).alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 7).value = s.enrollmentState || '';
    ws.getCell(currentRow, 7).font = { bold: true, color: { argb: PALETTE.tercioSup } };
    ws.getCell(currentRow, 7).alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 8).value = s.guardianName || '';
    ws.getCell(currentRow, 8).alignment = { horizontal: 'left', indent: 1 };

    ws.getCell(currentRow, 9).value = s.guardianPhone || '';
    ws.getCell(currentRow, 9).alignment = { horizontal: 'center' };

    for (let c = 1; c <= lastCol; c++) {
      const cell = ws.getCell(currentRow, c);
      cell.border = BORDERS.thin;
      if (!cell.fill) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      }
    }

    currentRow++;
  });

  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 13;
  ws.getColumn(4).width = 38;
  ws.getColumn(5).width = 8;
  ws.getColumn(6).width = 14;
  ws.getColumn(7).width = 14;
  ws.getColumn(8).width = 32;
  ws.getColumn(9).width = 15;

  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 7 }];

  await saveWorkbook(wb, `0011_Padron_${classroom.grade}_${classroom.section}.xlsx`);
};

// ============================================================================
// REPORTE 0001: LISTADO DE FAMILIAS POR ESTADO
// ============================================================================
export const exportFamiliesByStateExcel = async (
  data: FamiliesByStateReportData,
): Promise<void> => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SaaSchool Cloud Platform';
  wb.created = new Date();

  const ws = wb.addWorksheet('Familias por Estado', {
    views: [{ showGridLines: true }],
  });

  const { school, filterState, families, totalFamilies, totalStudents } = data;
  const { dateStr, timeStr } = getFormattedDateTime();
  const lastCol = 9;

  // Encabezado institucional
  ws.getCell(1, 1).value = school.name.toUpperCase();
  ws.getCell(1, 1).font = { bold: true, size: 11, color: { argb: PALETTE.headerBg } };
  ws.getCell(1, lastCol - 1).value = 'Fecha:';
  ws.getCell(1, lastCol).value = dateStr;

  ws.getCell(2, 1).value = 'SaaSchool Intranet';
  ws.getCell(2, 1).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
  ws.getCell(2, lastCol - 1).value = 'Hora:';
  ws.getCell(2, lastCol).value = timeStr;

  safeMerge(ws, 3, 2, 3, lastCol - 1);
  const titleCell = ws.getCell(3, 2);
  titleCell.value = 'LISTADO INSTITUCIONAL DE FAMILIAS POR ESTADO';
  titleCell.font = { bold: true, size: 13, color: { argb: PALETTE.headerBg } };
  titleCell.alignment = { horizontal: 'center' };

  ws.getCell(5, 1).value = `Estado Filtro: ${filterState === 'ALL' ? 'Todos los Estados' : filterState}`;
  ws.getCell(5, 1).font = { bold: true };
  ws.getCell(5, 4).value = `Total Familias: ${totalFamilies}`;
  ws.getCell(5, 4).font = { bold: true, color: { argb: PALETTE.headerBg } };
  ws.getCell(5, 7).value = `Total Estudiantes Vinculados: ${totalStudents}`;
  ws.getCell(5, 7).font = { bold: true, color: { argb: PALETTE.headerBg } };

  const headers = [
    'N°',
    'Cód. Familia',
    'Denominación de la Familia',
    'Padre de Familia',
    'Madre de Familia',
    'Teléfono Contacto',
    'Estado',
    'Cant. Hijos',
    'Hijos Matriculados (Salón / Nivel)',
  ];

  ws.getRow(7).height = 24;
  headers.forEach((h, idx) => {
    const cell = ws.getCell(7, idx + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: PALETTE.headerText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerBg } };
    cell.alignment = {
      horizontal: idx === 2 || idx === 3 || idx === 4 || idx === 8 ? 'left' : 'center',
      vertical: 'middle',
      indent: idx === 2 || idx === 3 || idx === 4 || idx === 8 ? 1 : 0,
    };
    cell.border = BORDERS.header;
  });

  let currentRow = 8;
  families.forEach((fam) => {
    ws.getRow(currentRow).height = 20;
    const isEven = currentRow % 2 === 0;
    const rowBg = isEven ? PALETTE.zebraBg : PALETTE.white;

    ws.getCell(currentRow, 1).value = fam.index;
    ws.getCell(currentRow, 1).alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 2).value = fam.familyCode;
    ws.getCell(currentRow, 2).alignment = { horizontal: 'center' };
    ws.getCell(currentRow, 2).font = { bold: true };

    ws.getCell(currentRow, 3).value = fam.familyName;
    ws.getCell(currentRow, 3).alignment = { horizontal: 'left', indent: 1 };
    ws.getCell(currentRow, 3).font = { bold: true, color: { argb: PALETTE.headerBg } };

    ws.getCell(currentRow, 4).value = fam.fatherName;
    ws.getCell(currentRow, 4).alignment = { horizontal: 'left', indent: 1 };

    ws.getCell(currentRow, 5).value = fam.motherName;
    ws.getCell(currentRow, 5).alignment = { horizontal: 'left', indent: 1 };

    const contactPhone = fam.fatherPhone !== '—' ? fam.fatherPhone : fam.motherPhone !== '—' ? fam.motherPhone : fam.guardianPhone;
    ws.getCell(currentRow, 6).value = contactPhone;
    ws.getCell(currentRow, 6).alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 7).value = fam.state;
    ws.getCell(currentRow, 7).font = { bold: true, color: { argb: fam.state === 'REGISTERED' ? PALETTE.tercioSup : PALETTE.gradeFail } };
    ws.getCell(currentRow, 7).alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 8).value = fam.childrenCount;
    ws.getCell(currentRow, 8).alignment = { horizontal: 'center' };
    ws.getCell(currentRow, 8).font = { bold: true };

    ws.getCell(currentRow, 9).value = fam.childrenSummary || '—';
    ws.getCell(currentRow, 9).alignment = { horizontal: 'left', indent: 1 };

    for (let c = 1; c <= lastCol; c++) {
      const cell = ws.getCell(currentRow, c);
      cell.border = BORDERS.thin;
      if (!cell.fill) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      }
    }

    currentRow++;
  });

  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 15;
  ws.getColumn(3).width = 34;
  ws.getColumn(4).width = 28;
  ws.getColumn(5).width = 28;
  ws.getColumn(6).width = 16;
  ws.getColumn(7).width = 15;
  ws.getColumn(8).width = 13;
  ws.getColumn(9).width = 46;

  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 7 }];

  await saveWorkbook(wb, `0001_Familias_Por_Estado_${filterState}.xlsx`);
};

// ============================================================================
// REPORTE 0002: LISTADO DE FAMILIAS E HIJOS
// ============================================================================
export const exportFamiliesChildrenExcel = async (
  data: FamiliesChildrenReportData,
): Promise<void> => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SaaSchool Cloud Platform';
  wb.created = new Date();

  const ws = wb.addWorksheet('Familias e Hijos', {
    views: [{ showGridLines: true }],
  });

  const { school, families, totalFamilies, totalChildren } = data;
  const { dateStr, timeStr } = getFormattedDateTime();
  const lastCol = 7;

  // Encabezado institucional
  ws.getCell(1, 1).value = school.name.toUpperCase();
  ws.getCell(1, 1).font = { bold: true, size: 11, color: { argb: PALETTE.headerBg } };
  ws.getCell(1, lastCol - 1).value = 'Fecha:';
  ws.getCell(1, lastCol).value = dateStr;

  ws.getCell(2, 1).value = 'SaaSchool Intranet';
  ws.getCell(2, 1).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
  ws.getCell(2, lastCol - 1).value = 'Hora:';
  ws.getCell(2, lastCol).value = timeStr;

  safeMerge(ws, 3, 2, 3, lastCol - 1);
  const titleCell = ws.getCell(3, 2);
  titleCell.value = 'LISTADO OFICIAL DE FAMILIAS E HIJOS MATRICULADOS';
  titleCell.font = { bold: true, size: 13, color: { argb: PALETTE.headerBg } };
  titleCell.alignment = { horizontal: 'center' };

  ws.getCell(5, 1).value = `Total Familias: ${totalFamilies}`;
  ws.getCell(5, 1).font = { bold: true, color: { argb: PALETTE.headerBg } };
  ws.getCell(5, 4).value = `Total Hijos Matriculados: ${totalChildren}`;
  ws.getCell(5, 4).font = { bold: true, color: { argb: PALETTE.headerBg } };

  let currentRow = 7;

  families.forEach((fam) => {
    // Fila Banner de Familia
    ws.getRow(currentRow).height = 24;
    safeMerge(ws, currentRow, 1, currentRow, lastCol);
    const famBanner = ws.getCell(currentRow, 1);
    famBanner.value = `👨‍👩‍👧‍👦 ${fam.familyCode} - ${fam.familyName.toUpperCase()}  |  Padre: ${fam.fatherName}  |  Madre: ${fam.motherName}  |  Tel: ${fam.phone}  |  Hijos: ${fam.childrenCount}`;
    famBanner.font = { bold: true, size: 10, color: { argb: PALETTE.subHeaderText } };
    famBanner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.subHeaderBg } };
    famBanner.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    for (let c = 1; c <= lastCol; c++) {
      ws.getCell(currentRow, c).border = BORDERS.header;
    }
    currentRow++;

    // Sub-cabecera de Hijos
    ws.getRow(currentRow).height = 20;
    const subHeaders = [
      'N°',
      'Cód. Alumno',
      'DNI / Doc.',
      'Apellidos y Nombres del Estudiante',
      'Nivel Educativo',
      'Grado y Sección',
      'Estado Matrícula',
    ];
    subHeaders.forEach((sh, idx) => {
      const cell = ws.getCell(currentRow, idx + 1);
      cell.value = sh;
      cell.font = { bold: true, size: 9, color: { argb: PALETTE.tableHeaderText } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.tableHeaderBg } };
      cell.alignment = {
        horizontal: idx === 3 ? 'left' : 'center',
        vertical: 'middle',
        indent: idx === 3 ? 1 : 0,
      };
      cell.border = BORDERS.thin;
    });
    currentRow++;

    // Filas de hijos
    fam.children.forEach((child) => {
      ws.getRow(currentRow).height = 19;
      const isEven = currentRow % 2 === 0;
      const rowBg = isEven ? PALETTE.zebraBg : PALETTE.white;

      ws.getCell(currentRow, 1).value = child.index;
      ws.getCell(currentRow, 1).alignment = { horizontal: 'center' };

      ws.getCell(currentRow, 2).value = child.studentCode || '—';
      ws.getCell(currentRow, 2).alignment = { horizontal: 'center' };
      ws.getCell(currentRow, 2).font = { bold: true };

      ws.getCell(currentRow, 3).value = child.documentId || '—';
      ws.getCell(currentRow, 3).alignment = { horizontal: 'center' };

      ws.getCell(currentRow, 4).value = child.fullName;
      ws.getCell(currentRow, 4).alignment = { horizontal: 'left', indent: 1 };

      ws.getCell(currentRow, 5).value = child.level;
      ws.getCell(currentRow, 5).alignment = { horizontal: 'center' };

      ws.getCell(currentRow, 6).value = child.classroomLabel;
      ws.getCell(currentRow, 6).alignment = { horizontal: 'center' };

      ws.getCell(currentRow, 7).value = child.enrollmentState;
      ws.getCell(currentRow, 7).font = { bold: true, color: { argb: PALETTE.tercioSup } };
      ws.getCell(currentRow, 7).alignment = { horizontal: 'center' };

      for (let c = 1; c <= lastCol; c++) {
        const cell = ws.getCell(currentRow, c);
        cell.border = BORDERS.thin;
        if (!cell.fill) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        }
      }

      currentRow++;
    });

    // Espacio separador entre familias
    currentRow++;
  });

  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 38;
  ws.getColumn(5).width = 18;
  ws.getColumn(6).width = 24;
  ws.getColumn(7).width = 16;

  await saveWorkbook(wb, `0002_Familias_e_Hijos.xlsx`);
};

// ============================================================================
// REPORTE 0003: LISTADO DE FAMILIAS Y PARIENTES (DIRECTORIO INSTITUCIONAL)
// ============================================================================
export const exportFamiliesRelativesExcel = async (
  data: FamiliesRelativesReportData,
): Promise<void> => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SaaSchool Cloud Platform';
  wb.created = new Date();

  const ws = wb.addWorksheet('Directorio Familias', {
    views: [{ showGridLines: true }],
  });

  const { school, records, totalRecords } = data;
  const { dateStr, timeStr } = getFormattedDateTime();
  const lastCol = 11;

  // Encabezado institucional
  ws.getCell(1, 1).value = school.name.toUpperCase();
  ws.getCell(1, 1).font = { bold: true, size: 11, color: { argb: PALETTE.headerBg } };
  ws.getCell(1, lastCol - 1).value = 'Fecha:';
  ws.getCell(1, lastCol).value = dateStr;

  ws.getCell(2, 1).value = 'SaaSchool Intranet';
  ws.getCell(2, 1).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
  ws.getCell(2, lastCol - 1).value = 'Hora:';
  ws.getCell(2, lastCol).value = timeStr;

  safeMerge(ws, 3, 3, 3, lastCol - 2);
  const titleCell = ws.getCell(3, 3);
  titleCell.value = 'DIRECTORIO GENERAL DE FAMILIAS, PADRES Y APODERADOS';
  titleCell.font = { bold: true, size: 13, color: { argb: PALETTE.headerBg } };
  titleCell.alignment = { horizontal: 'center' };

  ws.getCell(5, 1).value = `Total Registros de Estudiantes: ${totalRecords}`;
  ws.getCell(5, 1).font = { bold: true, color: { argb: PALETTE.headerBg } };

  const headers = [
    'N°',
    'Cód. Alumno',
    'DNI Alumno',
    'Apellidos y Nombres Estudiante',
    'Aula / Nivel',
    'Padre de Familia',
    'Tel. Padre',
    'Madre de Familia',
    'Tel. Madre',
    'Apoderado Legal',
    'Tel. Apoderado',
  ];

  ws.getRow(7).height = 24;
  headers.forEach((h, idx) => {
    const cell = ws.getCell(7, idx + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: PALETTE.headerText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerBg } };
    cell.alignment = {
      horizontal: idx === 3 || idx === 5 || idx === 7 || idx === 9 ? 'left' : 'center',
      vertical: 'middle',
      indent: idx === 3 || idx === 5 || idx === 7 || idx === 9 ? 1 : 0,
    };
    cell.border = BORDERS.header;
  });

  let currentRow = 8;
  records.forEach((rec) => {
    ws.getRow(currentRow).height = 19;
    const isEven = currentRow % 2 === 0;
    const rowBg = isEven ? PALETTE.zebraBg : PALETTE.white;

    ws.getCell(currentRow, 1).value = rec.index;
    ws.getCell(currentRow, 1).alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 2).value = rec.student.studentCode;
    ws.getCell(currentRow, 2).alignment = { horizontal: 'center' };
    ws.getCell(currentRow, 2).font = { bold: true };

    ws.getCell(currentRow, 3).value = rec.student.documentId;
    ws.getCell(currentRow, 3).alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 4).value = rec.student.fullName;
    ws.getCell(currentRow, 4).alignment = { horizontal: 'left', indent: 1 };
    ws.getCell(currentRow, 4).font = { bold: true, color: { argb: PALETTE.headerBg } };

    ws.getCell(currentRow, 5).value = rec.student.classroomLabel;
    ws.getCell(currentRow, 5).alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 6).value = rec.father.fullName;
    ws.getCell(currentRow, 6).alignment = { horizontal: 'left', indent: 1 };

    ws.getCell(currentRow, 7).value = rec.father.phone;
    ws.getCell(currentRow, 7).alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 8).value = rec.mother.fullName;
    ws.getCell(currentRow, 8).alignment = { horizontal: 'left', indent: 1 };

    ws.getCell(currentRow, 9).value = rec.mother.phone;
    ws.getCell(currentRow, 9).alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 10).value = rec.guardian.fullName;
    ws.getCell(currentRow, 10).alignment = { horizontal: 'left', indent: 1 };

    ws.getCell(currentRow, 11).value = rec.guardian.phone;
    ws.getCell(currentRow, 11).alignment = { horizontal: 'center' };

    for (let c = 1; c <= lastCol; c++) {
      const cell = ws.getCell(currentRow, c);
      cell.border = BORDERS.thin;
      if (!cell.fill) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      }
    }

    currentRow++;
  });

  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 15;
  ws.getColumn(3).width = 13;
  ws.getColumn(4).width = 34;
  ws.getColumn(5).width = 22;
  ws.getColumn(6).width = 28;
  ws.getColumn(7).width = 15;
  ws.getColumn(8).width = 28;
  ws.getColumn(9).width = 15;
  ws.getColumn(10).width = 28;
  ws.getColumn(11).width = 15;

  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 7 }];

  await saveWorkbook(wb, `0003_Directorio_Familias_y_Parientes.xlsx`);
};

// ============================================================================
// REPORTE 0019: LISTADO DE CUMPLEAÑOS DEL ALUMNO
// ============================================================================
export const exportStudentBirthdaysExcel = async (
  data: StudentBirthdaysReportData,
): Promise<void> => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SaaSchool Cloud Platform';
  wb.created = new Date();

  const ws = wb.addWorksheet('Cumpleaños', {
    views: [{ showGridLines: true }],
  });

  const { school, monthName, students, totalStudents } = data;
  const { dateStr, timeStr } = getFormattedDateTime();
  const lastCol = 9;

  // Encabezado institucional
  ws.getCell(1, 1).value = school.name.toUpperCase();
  ws.getCell(1, 1).font = { bold: true, size: 11, color: { argb: PALETTE.headerBg } };
  ws.getCell(1, lastCol - 1).value = 'Fecha:';
  ws.getCell(1, lastCol).value = dateStr;

  ws.getCell(2, 1).value = 'SaaSchool Intranet';
  ws.getCell(2, 1).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
  ws.getCell(2, lastCol - 1).value = 'Hora:';
  ws.getCell(2, lastCol).value = timeStr;

  safeMerge(ws, 3, 2, 3, lastCol - 1);
  const titleCell = ws.getCell(3, 2);
  titleCell.value = 'CALENDARIO INSTITUCIONAL DE CUMPLEAÑOS DE ESTUDIANTES';
  titleCell.font = { bold: true, size: 13, color: { argb: PALETTE.headerBg } };
  titleCell.alignment = { horizontal: 'center' };

  ws.getCell(5, 1).value = `Periodo / Mes: ${monthName.toUpperCase()}`;
  ws.getCell(5, 1).font = { bold: true };
  ws.getCell(5, 5).value = `Total Cumpleañeros: ${totalStudents}`;
  ws.getCell(5, 5).font = { bold: true, color: { argb: PALETTE.headerBg } };

  const headers = [
    'N°',
    'Día',
    'Mes',
    'Fecha de Nacimiento',
    'Edad a Cumplir',
    'Cód. Alumno',
    'Apellidos y Nombres',
    'Sexo',
    'Aula / Grado',
  ];

  ws.getRow(7).height = 24;
  headers.forEach((h, idx) => {
    const cell = ws.getCell(7, idx + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: PALETTE.headerText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerBg } };
    cell.alignment = {
      horizontal: idx === 6 ? 'left' : 'center',
      vertical: 'middle',
      indent: idx === 6 ? 1 : 0,
    };
    cell.border = BORDERS.header;
  });

  let currentRow = 8;
  students.forEach((s) => {
    ws.getRow(currentRow).height = 19;
    const isEven = currentRow % 2 === 0;
    const rowBg = isEven ? PALETTE.zebraBg : PALETTE.white;

    ws.getCell(currentRow, 1).value = s.index;
    ws.getCell(currentRow, 1).alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 2).value = s.day;
    ws.getCell(currentRow, 2).alignment = { horizontal: 'center' };
    ws.getCell(currentRow, 2).font = { bold: true, color: { argb: PALETTE.tercioSup } };

    ws.getCell(currentRow, 3).value = s.monthName;
    ws.getCell(currentRow, 3).alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 4).value = s.birthDateFormatted;
    ws.getCell(currentRow, 4).alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 5).value = s.ageTurning ? `${s.ageTurning} años` : '—';
    ws.getCell(currentRow, 5).alignment = { horizontal: 'center' };
    ws.getCell(currentRow, 5).font = { bold: true };

    ws.getCell(currentRow, 6).value = s.studentCode;
    ws.getCell(currentRow, 6).alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 7).value = s.fullName;
    ws.getCell(currentRow, 7).alignment = { horizontal: 'left', indent: 1 };
    ws.getCell(currentRow, 7).font = { bold: true, color: { argb: PALETTE.headerBg } };

    ws.getCell(currentRow, 8).value = s.gender;
    ws.getCell(currentRow, 8).alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 9).value = `${s.classroomLabel} (${s.educationLevel})`;
    ws.getCell(currentRow, 9).alignment = { horizontal: 'center' };

    for (let c = 1; c <= lastCol; c++) {
      const cell = ws.getCell(currentRow, c);
      cell.border = BORDERS.thin;
      if (!cell.fill) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      }
    }

    currentRow++;
  });

  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 8;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 16;
  ws.getColumn(6).width = 16;
  ws.getColumn(7).width = 36;
  ws.getColumn(8).width = 10;
  ws.getColumn(9).width = 26;

  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 7 }];

  await saveWorkbook(wb, `0019_Cumpleanos_${monthName}.xlsx`);
};

