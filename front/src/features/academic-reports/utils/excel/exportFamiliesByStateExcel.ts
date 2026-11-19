import { newWorkbook, saveWorkbook, safeMerge } from '@/lib/excel/base';
import type { FamiliesByStateReportData } from '../../types';
import { PALETTE, BORDERS, getFormattedDateTime } from './palette';

export const exportFamiliesByStateExcel = async (data: FamiliesByStateReportData): Promise<void> => {
  const wb = await newWorkbook();
  wb.creator = 'KIPUX';
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

  ws.getCell(2, 1).value = 'KIPUX';
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

    const contactPhone =
      fam.fatherPhone !== '—' ? fam.fatherPhone : fam.motherPhone !== '—' ? fam.motherPhone : fam.guardianPhone;
    ws.getCell(currentRow, 6).value = contactPhone;
    ws.getCell(currentRow, 6).alignment = { horizontal: 'center' };

    ws.getCell(currentRow, 7).value = fam.state;
    ws.getCell(currentRow, 7).font = {
      bold: true,
      color: { argb: fam.state === 'REGISTERED' ? PALETTE.tercioSup : PALETTE.gradeFail },
    };
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
