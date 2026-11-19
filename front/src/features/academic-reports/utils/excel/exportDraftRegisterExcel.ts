import { newWorkbook, saveWorkbook, safeMerge, styleRange } from '@/lib/excel/base';
import type { DraftRegisterReportData } from '../../types';
import { PALETTE, BORDERS, getFormattedDateTime } from './palette';

export const exportDraftRegisterExcel = async (data: DraftRegisterReportData): Promise<void> => {
  const { school, classroom, course, students, blankCriteriaColumnsCount = 20 } = data;
  const { dateStr, timeStr } = getFormattedDateTime();
  const year = new Date().getFullYear();

  const wb = await newWorkbook();
  const ws = wb.addWorksheet('Borrador', {
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1 },
  });

  const totalCols = 2 + blankCriteriaColumnsCount;

  ws.getCell(1, 1).value = school.name.toUpperCase();
  ws.getCell(1, 1).font = { bold: true, size: 11, color: { argb: PALETTE.headerBg } };
  ws.getCell(1, totalCols - 1).value = 'Fecha:';
  ws.getCell(1, totalCols).value = dateStr;

  ws.getCell(2, 1).value = 'KIPUX';
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
