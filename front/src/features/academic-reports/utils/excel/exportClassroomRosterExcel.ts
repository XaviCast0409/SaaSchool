import { newWorkbook, saveWorkbook, safeMerge } from '@/lib/excel/base';
import type { ClassroomRosterReportData } from '../../types';
import { PALETTE, BORDERS, getFormattedDateTime } from './palette';

export const exportClassroomRosterExcel = async (data: ClassroomRosterReportData): Promise<void> => {
  const { school, classroom, students, totalStudents } = data;
  const { dateStr, timeStr } = getFormattedDateTime();

  const wb = await newWorkbook();
  const ws = wb.addWorksheet('Padron', {
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1 },
  });

  const lastCol = 9;

  ws.getCell(1, 1).value = school.name.toUpperCase();
  ws.getCell(1, 1).font = { bold: true, size: 11, color: { argb: PALETTE.headerBg } };
  ws.getCell(1, lastCol - 1).value = 'Fecha:';
  ws.getCell(1, lastCol).value = dateStr;

  ws.getCell(2, 1).value = 'KIPUX';
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
    cell.alignment = {
      horizontal: idx === 3 || idx === 7 ? 'left' : 'center',
      vertical: 'middle',
      indent: idx === 3 || idx === 7 ? 1 : 0,
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
