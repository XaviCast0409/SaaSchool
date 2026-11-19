import { newWorkbook, saveWorkbook, safeMerge, styleRange, safeNumber } from '@/lib/excel/base';
import type { MeritClassroomReportData } from '../../types';
import { PALETTE, BORDERS, getFormattedDateTime } from './palette';

export const exportMeritClassroomExcel = async (data: MeritClassroomReportData): Promise<void> => {
  const { school, classroom, periodNumber, students, statistics } = data;
  const { dateStr, timeStr } = getFormattedDateTime();
  const year = new Date().getFullYear();

  const wb = await newWorkbook();
  wb.creator = 'KIPUX';

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

  ws.getCell(2, 1).value = 'KIPUX';
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
  ws.getColumn(1).width = 7; // Puesto
  ws.getColumn(2).width = 36; // Apellidos
  ws.getColumn(3).width = 10; // Sexo
  ws.getColumn(4).width = 12; // Promedio
  ws.getColumn(5).width = 10; // Puntaje
  ws.getColumn(6).width = 9; // Aprob
  ws.getColumn(7).width = 9; // Desap
  ws.getColumn(8).width = 8; // SN
  ws.getColumn(9).width = 11; // Conducta
  ws.getColumn(10).width = 12; // Tercio

  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 8 }];

  await saveWorkbook(wb, `0048_Merito_${classroom.grade}_${classroom.section}_B${periodNumber}.xlsx`);
};

// ============================================================================
// REPORTE 0049: ORDEN DE MÉRITO Y TERCIOS POR GRADO
// ============================================================================
