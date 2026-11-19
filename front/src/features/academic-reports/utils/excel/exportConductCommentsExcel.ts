import { newWorkbook, saveWorkbook, safeMerge } from '@/lib/excel/base';
import type { ConductCommentsReportData } from '../../types';
import { PALETTE, BORDERS, getFormattedDateTime } from './palette';

export const exportConductCommentsExcel = async (data: ConductCommentsReportData): Promise<void> => {
  const { school, classroom, periodNumber, students } = data;
  const { dateStr, timeStr } = getFormattedDateTime();
  const year = new Date().getFullYear();

  const wb = await newWorkbook();
  const ws = wb.addWorksheet('Conducta', {
    pageSetup: { orientation: 'portrait', paperSize: 9, fitToPage: true, fitToWidth: 1 },
  });

  ws.getCell(1, 1).value = school.name.toUpperCase();
  ws.getCell(1, 1).font = { bold: true, size: 11, color: { argb: PALETTE.headerBg } };
  ws.getCell(1, 3).value = 'Fecha:';
  ws.getCell(1, 4).value = dateStr;

  ws.getCell(2, 1).value = 'KIPUX';
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

    ws.getCell(currentRow, 4).value =
      `${classroom.tutorTeacher ? classroom.tutorTeacher.split(' ')[0] : 'Docente'} | ${dateStr} ${timeStr}`;
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
