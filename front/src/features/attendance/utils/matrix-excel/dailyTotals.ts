import type ExcelJS from 'exceljs';
import { colLetter } from '@/lib/excel/base';
import { PALETTE, thinBorder, applyStyle } from '../matrixExcelLayout';
import { DayColumnInfo } from './types';

export function renderDailyTotals(
  ws: ExcelJS.Worksheet,
  days: DayColumnInfo[],
  startRow: number,
  lastStudentRow: number,
  totRowP: number,
  totRowT: number,
  totRowF: number,
  totRowPct: number,
  summaryStartCol: number,
): void {
  // 1. Total Asistencias Diarias (P)
  ws.mergeCells(totRowP, 1, totRowP, 4);
  const labelP = ws.getCell(totRowP, 1);
  labelP.value = 'TOTAL ASISTENCIAS PUNTUALES (P)';
  applyStyle(labelP, {
    font: { bold: true, size: 8.5, color: { argb: PALETTE.presentText } },
    fillBg: PALETTE.presentBg,
    border: thinBorder,
    alignment: { horizontal: 'right', vertical: 'middle', indent: 1 },
  });

  days.forEach((d, idx) => {
    const col = 5 + idx;
    const cell = ws.getCell(totRowP, col);
    if (d.isWeekend) {
      cell.value = '';
      applyStyle(cell, { fillBg: PALETTE.weekendBg, border: thinBorder });
    } else {
      const cLet = colLetter(col);
      cell.value = {
        formula: `COUNTIF(${cLet}${startRow}:${cLet}${lastStudentRow},"P")`,
      };
      applyStyle(cell, {
        font: { bold: true, size: 8, color: { argb: PALETTE.presentText } },
        fillBg: PALETTE.presentBg,
        border: thinBorder,
        alignment: { horizontal: 'center', vertical: 'middle' },
      });
    }
  });

  // 2. Total Tardanzas Diarias (TI + TJ)
  ws.mergeCells(totRowT, 1, totRowT, 4);
  const labelT = ws.getCell(totRowT, 1);
  labelT.value = 'TOTAL TARDANZAS (TI + TJ)';
  applyStyle(labelT, {
    font: { bold: true, size: 8.5, color: { argb: PALETTE.lateInjText } },
    fillBg: PALETTE.lateInjBg,
    border: thinBorder,
    alignment: { horizontal: 'right', vertical: 'middle', indent: 1 },
  });

  days.forEach((d, idx) => {
    const col = 5 + idx;
    const cell = ws.getCell(totRowT, col);
    if (d.isWeekend) {
      cell.value = '';
      applyStyle(cell, { fillBg: PALETTE.weekendBg, border: thinBorder });
    } else {
      const cLet = colLetter(col);
      cell.value = {
        formula: `COUNTIF(${cLet}${startRow}:${cLet}${lastStudentRow},"TI")+COUNTIF(${cLet}${startRow}:${cLet}${lastStudentRow},"TJ")`,
      };
      applyStyle(cell, {
        font: { bold: true, size: 8, color: { argb: PALETTE.lateInjText } },
        fillBg: PALETTE.lateInjBg,
        border: thinBorder,
        alignment: { horizontal: 'center', vertical: 'middle' },
      });
    }
  });

  // 3. Total Faltas Diarias (FI + FJ)
  ws.mergeCells(totRowF, 1, totRowF, 4);
  const labelF = ws.getCell(totRowF, 1);
  labelF.value = 'TOTAL INASISTENCIAS (FI + FJ)';
  applyStyle(labelF, {
    font: { bold: true, size: 8.5, color: { argb: PALETTE.absentInjText } },
    fillBg: PALETTE.absentInjBg,
    border: thinBorder,
    alignment: { horizontal: 'right', vertical: 'middle', indent: 1 },
  });

  days.forEach((d, idx) => {
    const col = 5 + idx;
    const cell = ws.getCell(totRowF, col);
    if (d.isWeekend) {
      cell.value = '';
      applyStyle(cell, { fillBg: PALETTE.weekendBg, border: thinBorder });
    } else {
      const cLet = colLetter(col);
      cell.value = {
        formula: `COUNTIF(${cLet}${startRow}:${cLet}${lastStudentRow},"FI")+COUNTIF(${cLet}${startRow}:${cLet}${lastStudentRow},"FJ")`,
      };
      applyStyle(cell, {
        font: { bold: true, size: 8, color: { argb: PALETTE.absentInjText } },
        fillBg: PALETTE.absentInjBg,
        border: thinBorder,
        alignment: { horizontal: 'center', vertical: 'middle' },
      });
    }
  });

  // 4. Porcentaje Asistencia Diaria
  ws.mergeCells(totRowPct, 1, totRowPct, 4);
  const labelPct = ws.getCell(totRowPct, 1);
  labelPct.value = '% ASISTENCIA EFECTIVA DIARIA';
  applyStyle(labelPct, {
    font: { bold: true, size: 8.5, color: { argb: PALETTE.navyDark } },
    fillBg: PALETTE.iceBlue,
    border: thinBorder,
    alignment: { horizontal: 'right', vertical: 'middle', indent: 1 },
  });

  days.forEach((d, idx) => {
    const col = 5 + idx;
    const cell = ws.getCell(totRowPct, col);
    if (d.isWeekend) {
      cell.value = '';
      applyStyle(cell, { fillBg: PALETTE.weekendBg, border: thinBorder });
    } else {
      const cLet = colLetter(col);
      cell.value = {
        formula: `IF((${cLet}${totRowP}+${cLet}${totRowF})>0,${cLet}${totRowP}/(${cLet}${totRowP}+${cLet}${totRowF}),0)`,
      };
      cell.numFmt = '0.0%';
      applyStyle(cell, {
        font: { bold: true, size: 8, color: { argb: PALETTE.navyDark } },
        fillBg: PALETTE.iceBlue,
        border: thinBorder,
        alignment: { horizontal: 'center', vertical: 'middle' },
      });
    }
  });

  // Rellenar celdas de las columnas de resumen en las filas de totales
  for (let r = totRowP; r <= totRowPct; r++) {
    for (let c = summaryStartCol; c <= summaryStartCol + 5; c++) {
      const cell = ws.getCell(r, c);
      cell.value = '';
      applyStyle(cell, { fillBg: PALETTE.slateLight, border: thinBorder });
    }
  }
}
