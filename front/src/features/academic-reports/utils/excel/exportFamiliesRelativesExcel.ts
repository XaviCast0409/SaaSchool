import { newWorkbook, saveWorkbook, safeMerge } from '@/lib/excel/base';
import type { FamiliesRelativesReportData } from '../../types';
import { PALETTE, BORDERS, getFormattedDateTime } from './palette';

export const exportFamiliesRelativesExcel = async (data: FamiliesRelativesReportData): Promise<void> => {
  const wb = await newWorkbook();
  wb.creator = 'KIPUX';
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

  ws.getCell(2, 1).value = 'KIPUX';
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
