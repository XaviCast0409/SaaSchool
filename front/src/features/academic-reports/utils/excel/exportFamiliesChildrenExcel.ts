import { newWorkbook, saveWorkbook, safeMerge } from '@/lib/excel/base';
import type { FamiliesChildrenReportData } from '../../types';
import { PALETTE, BORDERS, getFormattedDateTime } from './palette';

export const exportFamiliesChildrenExcel = async (data: FamiliesChildrenReportData): Promise<void> => {
  const wb = await newWorkbook();
  wb.creator = 'KIPUX';
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

  ws.getCell(2, 1).value = 'KIPUX';
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
