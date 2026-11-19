import { formatEducationLevel } from '@/lib/utils';
import { newWorkbook, saveWorkbook, safeMerge } from '@/lib/excel/base';
import type { StudentBirthdaysReportData } from '../../types';
import { PALETTE, BORDERS, getFormattedDateTime } from './palette';

export const exportStudentBirthdaysExcel = async (data: StudentBirthdaysReportData): Promise<void> => {
  const wb = await newWorkbook();
  wb.creator = 'KIPUX';
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

  ws.getCell(2, 1).value = 'KIPUX';
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

    ws.getCell(currentRow, 9).value = `${s.classroomLabel} (${formatEducationLevel(s.educationLevel)})`;
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
