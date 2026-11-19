import { formatEducationLevel } from '@/lib/utils';
import { newWorkbook, saveWorkbook, safeMerge, styleRange, safeNumber } from '@/lib/excel/base';
import type { MeritGradeReportData } from '../../types';
import { PALETTE, BORDERS, getFormattedDateTime } from './palette';

export const exportMeritGradeExcel = async (data: MeritGradeReportData): Promise<void> => {
  const { school, educationLevel, grade, periodNumber, students, statistics } = data;
  const { dateStr, timeStr } = getFormattedDateTime();
  const year = new Date().getFullYear();

  const wb = await newWorkbook();
  wb.creator = 'KIPUX';

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

  ws.getCell(2, 1).value = 'KIPUX';
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
  subCell.value = `${periodNumber}° BIMESTRE ${year} | Nivel: ${formatEducationLevel(educationLevel)} - ${grade}° Grado`;
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
    ws.getCell(currentRow, 11).font = {
      bold: true,
      color: { argb: s.tercio === 'SUP' ? PALETTE.tercioSup : PALETTE.tercioInf },
    };
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
      ws.getCell(r, 7).value = statistics.tercios.withoutTercio?.percent
        ? `${statistics.tercios.withoutTercio.percent}%`
        : '0%';
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
