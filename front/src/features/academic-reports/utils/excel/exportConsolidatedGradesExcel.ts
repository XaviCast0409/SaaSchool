import { newWorkbook, saveWorkbook, safeMerge, styleRange, safeNumber } from '@/lib/excel/base';
import type { ConsolidatedGradesReportData } from '../../types';
import { PALETTE, BORDERS, getFormattedDateTime } from './palette';

export const exportConsolidatedGradesExcel = async (data: ConsolidatedGradesReportData): Promise<void> => {
  const { school, classroom, periodNumber, courses, students, courseStats, totalAttendances } = data;
  const { dateStr, timeStr } = getFormattedDateTime();
  const year = new Date().getFullYear();

  const wb = await newWorkbook();
  wb.creator = 'KIPUX';
  wb.lastModifiedBy = 'KIPUX';
  wb.created = new Date();

  const ws = wb.addWorksheet('Consolidado', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
  });

  const hasCourses = courses && courses.length > 0;
  const effectiveCourseCols = hasCourses ? courses.length : 1;
  const lastCol = 2 + effectiveCourseCols + 10;
  const colOffset = 2 + effectiveCourseCols;

  // 1. Encabezado Institucional
  ws.getCell(1, 1).value = school.name.toUpperCase();
  ws.getCell(1, 1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: PALETTE.headerBg } };

  ws.getCell(1, lastCol - 1).value = 'Fecha:';
  ws.getCell(1, lastCol - 1).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF64748B' } };
  ws.getCell(1, lastCol - 1).alignment = { horizontal: 'right' };
  ws.getCell(1, lastCol).value = dateStr;
  ws.getCell(1, lastCol).font = { name: 'Calibri', size: 9 };

  ws.getCell(2, 1).value = 'KIPUX';
  ws.getCell(2, 1).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } };

  ws.getCell(2, lastCol - 1).value = 'Hora:';
  ws.getCell(2, lastCol - 1).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF64748B' } };
  ws.getCell(2, lastCol - 1).alignment = { horizontal: 'right' };
  ws.getCell(2, lastCol).value = timeStr;
  ws.getCell(2, lastCol).font = { name: 'Calibri', size: 9 };

  // 2. Título Central
  safeMerge(ws, 4, 3, 4, Math.max(3, lastCol - 2));
  const titleCell = ws.getCell(4, 3);
  titleCell.value = `CONSOLIDADO DE NOTAS - ${year}`;
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: PALETTE.headerBg } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(4).height = 24;

  // 3. Barra de Metadatos
  const infoRow = 6;
  ws.getRow(infoRow).height = 20;
  ws.getCell(infoRow, 1).value = 'Salón:';
  ws.getCell(infoRow, 1).font = { bold: true, size: 9, color: { argb: PALETTE.infoText } };
  ws.getCell(infoRow, 2).value = `${classroom.grade}° Grado ${classroom.section}`;
  ws.getCell(infoRow, 2).font = { bold: true, size: 10, color: { argb: PALETTE.headerBg } };

  ws.getCell(infoRow, 4).value = 'Periodo:';
  ws.getCell(infoRow, 4).font = { bold: true, size: 9, color: { argb: PALETTE.infoText } };
  ws.getCell(infoRow, 5).value = `${periodNumber}° Bimestre`;
  ws.getCell(infoRow, 5).font = { bold: true, size: 10, color: { argb: PALETTE.headerBg } };

  ws.getCell(infoRow, 7).value = 'Tutora:';
  ws.getCell(infoRow, 7).font = { bold: true, size: 9, color: { argb: PALETTE.infoText } };
  ws.getCell(infoRow, 8).value = classroom.tutorTeacher;
  ws.getCell(infoRow, 8).font = { bold: true, size: 9, color: { argb: PALETTE.tableHeaderText } };

  // 4. Cabecera Principal de la Tabla (Filas 7 y 8)
  ws.getRow(7).height = 22;
  ws.getRow(8).height = 26;

  // N°
  safeMerge(ws, 7, 1, 8, 1);
  ws.getCell(7, 1).value = 'N°';

  // APELLIDOS Y NOMBRES
  safeMerge(ws, 7, 2, 8, 2);
  ws.getCell(7, 2).value = 'APELLIDOS Y NOMBRES';

  // ASIGNATURAS
  if (hasCourses) {
    if (courses.length > 1) {
      safeMerge(ws, 7, 3, 7, 2 + courses.length);
    }
    ws.getCell(7, 3).value = 'ASIGNATURAS';
    courses.forEach((c, idx) => {
      const cell = ws.getCell(8, 3 + idx);
      cell.value = c.name;
      cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: PALETTE.subHeaderText } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.subHeaderBg } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = BORDERS.thin;
    });
  } else {
    safeMerge(ws, 7, 3, 8, 3);
    ws.getCell(7, 3).value = '(Sin Asignaturas)';
  }

  // Columnas Finales de Resumen
  const finalHeaders = [
    { label: 'CONDUCTA', col: colOffset + 1 },
    { label: 'PROMEDIO', col: colOffset + 2 },
    { label: 'PUNTAJE', col: colOffset + 3 },
    { label: 'N° DESAP.', col: colOffset + 4 },
    { label: 'ORDEN MÉRITO', col: colOffset + 5 },
    { label: 'TERCIO', col: colOffset + 6 },
    { label: 'Tardanza Injust.', col: colOffset + 7 },
    { label: 'Tardanza Just.', col: colOffset + 8 },
    { label: 'Falta Injust.', col: colOffset + 9 },
    { label: 'Falta Just.', col: colOffset + 10 },
  ];

  finalHeaders.forEach((h) => {
    safeMerge(ws, 7, h.col, 8, h.col);
    ws.getCell(7, h.col).value = h.label;
  });

  // Estilo general para toda la cabecera (Fila 7)
  styleRange(ws, 7, 1, 7, lastCol, {
    font: { name: 'Calibri', size: 9, bold: true, color: { argb: PALETTE.headerText } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerBg } },
    border: BORDERS.header,
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
  });

  // Asegurar bordes en celdas combinadas de la fila 8
  [1, 2, ...finalHeaders.map((h) => h.col)].forEach((c) => {
    ws.getCell(8, c).border = BORDERS.header;
  });

  // 5. Filas de Alumnos (Row 9 en adelante)
  let currentRow = 9;
  students.forEach((s) => {
    ws.getRow(currentRow).height = 19;
    const isEven = s.orderIndex % 2 === 0;
    const rowBg = isEven ? PALETTE.zebraBg : PALETTE.white;

    // Col 1: N°
    const cellNum = ws.getCell(currentRow, 1);
    cellNum.value = s.orderIndex;
    cellNum.alignment = { horizontal: 'center', vertical: 'middle' };

    // Col 2: Apellidos y Nombres
    const cellName = ws.getCell(currentRow, 2);
    cellName.value = s.fullName;
    cellName.font = { name: 'Calibri', size: 9.5, bold: false };
    cellName.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    // Cursos
    if (hasCourses) {
      courses.forEach((c, idx) => {
        const score = s.courseScores ? s.courseScores[c.id] : undefined;
        const cellScore = ws.getCell(currentRow, 3 + idx);
        const rounded = safeNumber(score);
        if (rounded !== '') {
          cellScore.value = Math.round(Number(rounded));
          cellScore.numFmt = '00';
          const isFailing = Number(rounded) < 10.5;
          cellScore.font = {
            name: 'Calibri',
            size: 9.5,
            bold: isFailing,
            color: { argb: isFailing ? PALETTE.gradeFail : PALETTE.gradePass },
          };
        } else {
          cellScore.value = '';
        }
        cellScore.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    } else {
      const cellEmpty = ws.getCell(currentRow, 3);
      cellEmpty.value = '-';
      cellEmpty.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Conducta
    const cellConduct = ws.getCell(currentRow, colOffset + 1);
    cellConduct.value = s.conduct;
    cellConduct.alignment = { horizontal: 'center', vertical: 'middle' };

    // Promedio (Destacado)
    const cellAvg = ws.getCell(currentRow, colOffset + 2);
    const avgNum = safeNumber(s.average, 1);
    if (avgNum !== '') {
      cellAvg.value = avgNum;
      cellAvg.numFmt = '0.0';
      const isFailingAvg = Number(avgNum) < 10.5;
      cellAvg.font = {
        name: 'Calibri',
        size: 9.5,
        bold: true,
        color: { argb: isFailingAvg ? PALETTE.gradeFail : PALETTE.gradePass },
      };
    } else {
      cellAvg.value = '';
    }
    cellAvg.alignment = { horizontal: 'center', vertical: 'middle' };

    // Puntaje
    const cellPoints = ws.getCell(currentRow, colOffset + 3);
    cellPoints.value = safeNumber(s.points);
    cellPoints.font = { name: 'Calibri', size: 9, bold: true };
    cellPoints.alignment = { horizontal: 'center', vertical: 'middle' };

    // N° Desaprobados
    const cellFailed = ws.getCell(currentRow, colOffset + 4);
    cellFailed.value = s.failedCoursesCount > 0 ? s.failedCoursesCount : '';
    if (s.failedCoursesCount > 0) {
      cellFailed.font = { name: 'Calibri', size: 9, bold: true, color: { argb: PALETTE.gradeFail } };
    }
    cellFailed.alignment = { horizontal: 'center', vertical: 'middle' };

    // Orden de Mérito
    const cellMerit = ws.getCell(currentRow, colOffset + 5);
    cellMerit.value = s.meritOrder ?? '';
    cellMerit.font = { name: 'Calibri', size: 9.5, bold: true };
    cellMerit.alignment = { horizontal: 'center', vertical: 'middle' };

    // Tercio
    const cellTercio = ws.getCell(currentRow, colOffset + 6);
    cellTercio.value = s.tercio ?? '';
    const tercioColor =
      s.tercio === 'SUP' ? PALETTE.tercioSup : s.tercio === 'MED' ? PALETTE.tercioMed : PALETTE.tercioInf;
    cellTercio.font = { name: 'Calibri', size: 9, bold: true, color: { argb: tercioColor } };
    cellTercio.alignment = { horizontal: 'center', vertical: 'middle' };

    // Asistencias
    const cellAtt1 = ws.getCell(currentRow, colOffset + 7);
    cellAtt1.value = s.attendance?.lateUnjustified || '';
    cellAtt1.alignment = { horizontal: 'center', vertical: 'middle' };

    const cellAtt2 = ws.getCell(currentRow, colOffset + 8);
    cellAtt2.value = s.attendance?.lateJustified || '';
    cellAtt2.alignment = { horizontal: 'center', vertical: 'middle' };

    const cellAtt3 = ws.getCell(currentRow, colOffset + 9);
    cellAtt3.value = s.attendance?.absentUnjustified || '';
    cellAtt3.alignment = { horizontal: 'center', vertical: 'middle' };

    const cellAtt4 = ws.getCell(currentRow, colOffset + 10);
    cellAtt4.value = s.attendance?.absentJustified || '';
    cellAtt4.alignment = { horizontal: 'center', vertical: 'middle' };

    // Aplicar bordes y fondo cebra a todas las celdas de la fila
    for (let col = 1; col <= lastCol; col++) {
      const c = ws.getCell(currentRow, col);
      c.border = BORDERS.thin;
      if (!c.fill) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      }
    }

    currentRow++;
  });

  // 6. Estadísticas Inferiores por Asignatura (Idéntico a Cubicol)
  currentRow++; // Fila vacía separadora

  const statLabels = [
    { label: 'Promedio del curso:', key: 'average', isDecimal: true },
    { label: 'N° de alumnos Aprobados:', key: 'approvedCount' },
    { label: 'N° de alumnos Desaprobados:', key: 'failedCount' },
    { label: '% de alumnos Aprobados:', key: 'approvedPercent', isPercent: true },
    { label: '% de alumnos Desaprobados:', key: 'failedPercent', isPercent: true },
    { label: 'Nota Máxima:', key: 'maxScore' },
    { label: 'Nota Mínima:', key: 'minScore' },
  ];

  statLabels.forEach((stat, sIdx) => {
    ws.getRow(currentRow).height = 18;
    safeMerge(ws, currentRow, 1, currentRow, 2);
    const labelCell = ws.getCell(currentRow, 1);
    labelCell.value = stat.label;
    labelCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: PALETTE.tableHeaderText } };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.tableHeaderBg } };
    labelCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    labelCell.border = sIdx === 6 ? BORDERS.doubleBottom : BORDERS.thin;
    ws.getCell(currentRow, 2).border = sIdx === 6 ? BORDERS.doubleBottom : BORDERS.thin;

    if (hasCourses) {
      courses.forEach((c, idx) => {
        const valCell = ws.getCell(currentRow, 3 + idx);
        const st = courseStats?.[c.id];
        const rawVal = st ? (st as unknown as Record<string, unknown>)[stat.key] : null;

        if (stat.isPercent) {
          valCell.value = rawVal !== null && rawVal !== undefined ? `${rawVal}%` : '';
        } else if (stat.isDecimal) {
          const num = safeNumber(rawVal, 1);
          valCell.value = num !== '' ? num : '';
          valCell.numFmt = '0.0';
        } else {
          valCell.value = safeNumber(rawVal);
        }

        valCell.font = { name: 'Calibri', size: 9, bold: true };
        valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.tableHeaderBg } };
        valCell.alignment = { horizontal: 'center', vertical: 'middle' };
        valCell.border = sIdx === 6 ? BORDERS.doubleBottom : BORDERS.thin;
      });
    } else {
      const valCell = ws.getCell(currentRow, 3);
      valCell.value = '-';
      valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.tableHeaderBg } };
      valCell.border = sIdx === 6 ? BORDERS.doubleBottom : BORDERS.thin;
    }

    // En la primera fila de estadísticas, incluir totales de asistencias
    if (sIdx === 0) {
      const attTotals = [
        totalAttendances?.lateUnjustified || '',
        totalAttendances?.lateJustified || '',
        totalAttendances?.absentUnjustified || '',
        totalAttendances?.absentJustified || '',
      ];
      attTotals.forEach((totalVal, aIdx) => {
        const cell = ws.getCell(currentRow, colOffset + 7 + aIdx);
        cell.value = totalVal;
        cell.font = { name: 'Calibri', size: 9, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.tableHeaderBg } };
        cell.border = BORDERS.thin;
      });
    }

    currentRow++;
  });

  // 7. Configuración de Columnas y Anchos Óptimos
  ws.getColumn(1).width = 5; // N°
  ws.getColumn(2).width = 38; // APELLIDOS Y NOMBRES
  if (hasCourses) {
    courses.forEach((_, idx) => {
      ws.getColumn(3 + idx).width = 15;
    });
  } else {
    ws.getColumn(3).width = 20;
  }
  ws.getColumn(colOffset + 1).width = 11; // Conducta
  ws.getColumn(colOffset + 2).width = 12; // Promedio
  ws.getColumn(colOffset + 3).width = 10; // Puntaje
  ws.getColumn(colOffset + 4).width = 14; // Desaprobados
  ws.getColumn(colOffset + 5).width = 15; // Orden Mérito
  ws.getColumn(colOffset + 6).width = 10; // Tercio
  ws.getColumn(colOffset + 7).width = 15; // T. Injust
  ws.getColumn(colOffset + 8).width = 15; // T. Just
  ws.getColumn(colOffset + 9).width = 14; // F. Injust
  ws.getColumn(colOffset + 10).width = 14; // F. Just

  // 8. Inmovilizar Paneles (Cabecera y Columnas N° y Alumnos fijas al hacer scroll)
  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 8 }];

  await saveWorkbook(wb, `0021_Consolidado_${classroom.grade}_${classroom.section}_B${periodNumber}.xlsx`);
};
