import type ExcelJS from 'exceljs';
import { PALETTE, thinBorder, headerCellBorder, applyStyle } from '../matrixExcelLayout';
import { DayColumnInfo } from './types';

export function renderInstitutionalHeader(
  ws: ExcelJS.Worksheet,
  totalCols: number,
  isWithAttendance: boolean,
  schoolName: string,
  classroomLabel: string | undefined,
  periodText: string,
  studentsCount: number,
): void {
  // Fila 1: Encabezado Institucional Supremo
  ws.mergeCells(1, 1, 1, totalCols);
  const row1 = ws.getRow(1);
  row1.height = 24;
  const cell1 = ws.getCell(1, 1);
  cell1.value = 'REPÚBLICA DEL PERÚ • MINISTERIO DE EDUCACIÓN';
  applyStyle(cell1, {
    font: { bold: true, size: 10.5, color: { argb: 'FFFFFFFF' } },
    fillBg: PALETTE.navyDark,
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  // Fila 2: Título Oficial del Registro
  ws.mergeCells(2, 1, 2, totalCols);
  const row2 = ws.getRow(2);
  row2.height = 26;
  const cell2 = ws.getCell(2, 1);
  cell2.value = isWithAttendance
    ? 'REGISTRO AUXILIAR MENSUAL DE ASISTENCIA Y PERMANENCIA ESCOLAR (SIAGIE)'
    : 'REGISTRO AUXILIAR DE CONTROL DIARIO DE ASISTENCIA (PLANTILLA PARA LLENADO MANUAL)';
  applyStyle(cell2, {
    font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
    fillBg: PALETTE.navyBlue,
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  // Fila 3: Barra de Metadatos del Colegio y Sección
  ws.mergeCells(3, 1, 3, totalCols);
  const row3 = ws.getRow(3);
  row3.height = 22;
  const cell3 = ws.getCell(3, 1);
  const now = new Date();
  const emissionDate = now.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Lima',
  });
  cell3.value = `I.E.: ${schoolName.toUpperCase()}   |   AULA / SECCIÓN: ${(classroomLabel || 'TODAS LAS SECCIONES').toUpperCase()}   |   MES: ${periodText}   |   EMISIÓN: ${emissionDate}   |   ESTUDIANTES: ${studentsCount}`;
  applyStyle(cell3, {
    font: { bold: true, size: 9, color: { argb: PALETTE.navyDark } },
    fillBg: PALETTE.iceBlue,
    border: thinBorder,
    alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
  });

  // Fila 4: Separador Estético
  const row4 = ws.getRow(4);
  row4.height = 6;
}

export function renderTableHeaders(
  ws: ExcelJS.Worksheet,
  days: DayColumnInfo[],
  daysInMonth: number,
  periodText: string,
  summaryStartCol: number,
): void {
  const row5 = ws.getRow(5);
  row5.height = 20;
  const row6 = ws.getRow(6);
  row6.height = 24;

  // N°
  ws.mergeCells(5, 1, 6, 1);
  const cellN = ws.getCell(5, 1);
  cellN.value = 'N°';
  applyStyle(cellN, {
    font: { bold: true, size: 9, color: { argb: 'FFFFFFFF' } },
    fillBg: PALETTE.navyDark,
    border: headerCellBorder,
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  // Apellidos y Nombres
  ws.mergeCells(5, 2, 6, 2);
  const cellName = ws.getCell(5, 2);
  cellName.value = 'APELLIDOS Y NOMBRES DEL ESTUDIANTE';
  applyStyle(cellName, {
    font: { bold: true, size: 9, color: { argb: 'FFFFFFFF' } },
    fillBg: PALETTE.navyDark,
    border: headerCellBorder,
    alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
  });

  // DNI
  ws.mergeCells(5, 3, 6, 3);
  const cellDni = ws.getCell(5, 3);
  cellDni.value = 'DNI';
  applyStyle(cellDni, {
    font: { bold: true, size: 9, color: { argb: 'FFFFFFFF' } },
    fillBg: PALETTE.navyDark,
    border: headerCellBorder,
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  // Aula
  ws.mergeCells(5, 4, 6, 4);
  const cellClassroom = ws.getCell(5, 4);
  cellClassroom.value = 'AULA';
  applyStyle(cellClassroom, {
    font: { bold: true, size: 9, color: { argb: 'FFFFFFFF' } },
    fillBg: PALETTE.navyDark,
    border: headerCellBorder,
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  // Cabecera Agrupada de Días
  ws.mergeCells(5, 5, 5, 4 + daysInMonth);
  const cellDaysHeader = ws.getCell(5, 5);
  cellDaysHeader.value = `DÍAS DEL MES • ${periodText}`;
  applyStyle(cellDaysHeader, {
    font: { bold: true, size: 9, color: { argb: 'FFFFFFFF' } },
    fillBg: PALETTE.headerDayBg,
    border: headerCellBorder,
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  // Sub-cabeceras de cada día
  days.forEach((d, idx) => {
    const col = 5 + idx;
    const cell = ws.getCell(6, col);
    cell.value = `${d.short}\n${String(d.day).padStart(2, '0')}`;
    applyStyle(cell, {
      font: {
        bold: true,
        size: 7.5,
        color: { argb: d.isWeekend ? PALETTE.navyDark : PALETTE.headerDayText },
      },
      fillBg: d.isWeekend ? PALETTE.slateBorderDark : PALETTE.headerDayBg,
      border: thinBorder,
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    });
  });

  // Cabecera Agrupada de Resumen
  ws.mergeCells(5, summaryStartCol, 5, summaryStartCol + 5);
  const cellSummaryHeader = ws.getCell(5, summaryStartCol);
  cellSummaryHeader.value = 'RESUMEN ACUMULADO DEL MES';
  applyStyle(cellSummaryHeader, {
    font: { bold: true, size: 9, color: { argb: 'FFFFFFFF' } },
    fillBg: PALETTE.headerSummaryBg,
    border: headerCellBorder,
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  // Sub-cabeceras de Resumen
  const summaryHeaders = [
    { label: 'ASIST.\n(P)', col: summaryStartCol },
    { label: 'FALTAS\nJUST.(FJ)', col: summaryStartCol + 1 },
    { label: 'FALTAS\nINJ.(FI)', col: summaryStartCol + 2 },
    { label: 'TARD.\n(TI+TJ)', col: summaryStartCol + 3 },
    { label: '% ASIST.\nMENSUAL', col: summaryStartCol + 4 },
    { label: 'ESTADO /\nRIESGO', col: summaryStartCol + 5 },
  ];

  summaryHeaders.forEach((sh) => {
    const cell = ws.getCell(6, sh.col);
    cell.value = sh.label;
    applyStyle(cell, {
      font: { bold: true, size: 7.5, color: { argb: 'FFFFFFFF' } },
      fillBg: PALETTE.headerSummarySubBg,
      border: thinBorder,
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    });
  });
}

export function renderLegendAndSignatures(
  ws: ExcelJS.Worksheet,
  bottomStartRow: number,
  totalCols: number,
): void {
  // Leyenda
  ws.mergeCells(bottomStartRow, 2, bottomStartRow, 14);
  const legendTitle = ws.getCell(bottomStartRow, 2);
  legendTitle.value = 'LEYENDA OFICIAL DE CONVENCIÓN MINEDU / SIAGIE:';
  applyStyle(legendTitle, {
    font: { bold: true, size: 8.5, color: { argb: PALETTE.navyDark } },
  });

  const legendItems = [
    { code: 'P', label: 'Asistencia Puntual' },
    { code: 'TI', label: 'Tardanza Injustificada' },
    { code: 'TJ', label: 'Tardanza Justificada' },
    { code: 'FI', label: 'Falta Injustificada' },
    { code: 'FJ', label: 'Falta Justificada' },
    { code: 'S / D', label: 'Fin de Semana (Sábado / Domingo)' },
  ];

  legendItems.forEach((item, lIdx) => {
    const row = bottomStartRow + 1 + lIdx;
    ws.mergeCells(row, 2, row, 14);
    const cell = ws.getCell(row, 2);
    cell.value = `[ ${item.code} ] : ${item.label}`;
    applyStyle(cell, {
      font: { size: 8, color: { argb: 'FF334155' } },
    });
  });

  // Firmas Institucionales
  const sigRow = bottomStartRow + 4;
  const sigColTutorStart = 16;
  const sigColTutorEnd = 24;
  const sigColDirectorStart = 27;
  const sigColDirectorEnd = Math.min(36, totalCols - 1);

  ws.mergeCells(sigRow, sigColTutorStart, sigRow, sigColTutorEnd);
  const sigTutorLine = ws.getCell(sigRow, sigColTutorStart);
  sigTutorLine.value = 'DOCENTE TUTOR(A) / RESPONSABLE';
  applyStyle(sigTutorLine, {
    font: { bold: true, size: 8.5, color: { argb: PALETTE.navyDark } },
    border: { top: { style: 'medium', color: { argb: 'FF0F172A' } } },
    alignment: { horizontal: 'center', vertical: 'top' },
  });

  ws.mergeCells(sigRow + 1, sigColTutorStart, sigRow + 1, sigColTutorEnd);
  const sigTutorSub = ws.getCell(sigRow + 1, sigColTutorStart);
  sigTutorSub.value = 'Firma y Sello de Aula';
  applyStyle(sigTutorSub, {
    font: { size: 7.5, color: { argb: 'FF64748B' } },
    alignment: { horizontal: 'center', vertical: 'top' },
  });

  ws.mergeCells(sigRow, sigColDirectorStart, sigRow, sigColDirectorEnd);
  const sigDirLine = ws.getCell(sigRow, sigColDirectorStart);
  sigDirLine.value = 'DIRECCIÓN / SUBDIRECCIÓN ACADÉMICA';
  applyStyle(sigDirLine, {
    font: { bold: true, size: 8.5, color: { argb: PALETTE.navyDark } },
    border: { top: { style: 'medium', color: { argb: 'FF0F172A' } } },
    alignment: { horizontal: 'center', vertical: 'top' },
  });

  ws.mergeCells(sigRow + 1, sigColDirectorStart, sigRow + 1, sigColDirectorEnd);
  const sigDirSub = ws.getCell(sigRow + 1, sigColDirectorStart);
  sigDirSub.value = 'V° B° y Sello Institucional Oficial';
  applyStyle(sigDirSub, {
    font: { size: 7.5, color: { argb: 'FF64748B' } },
    alignment: { horizontal: 'center', vertical: 'top' },
  });
}
