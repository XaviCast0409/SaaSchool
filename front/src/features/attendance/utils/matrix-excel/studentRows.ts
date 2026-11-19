import type ExcelJS from 'exceljs';
import { colLetter } from '@/lib/excel/base';
import { AttendanceMatrixStudentRow } from '../../types';
import { PALETTE, thinBorder, applyStyle } from '../matrixExcelLayout';
import { DayColumnInfo } from './types';

function renderDayCell(
  cell: ExcelJS.Cell,
  d: DayColumnInfo,
  isWithAttendance: boolean,
  student: AttendanceMatrixStudentRow | null,
  defaultRowBg: string,
): void {
  if (d.isWeekend) {
    cell.value = d.isSunday ? 'D' : 'S';
    applyStyle(cell, {
      font: { bold: true, size: 8, color: { argb: PALETTE.weekendText } },
      fillBg: PALETTE.weekendBg,
      border: thinBorder,
      alignment: { horizontal: 'center', vertical: 'middle' },
    });
    return;
  }

  if (!isWithAttendance || !student) {
    cell.value = '';
    applyStyle(cell, {
      fillBg: isWithAttendance ? defaultRowBg : 'FFFFFFFF',
      border: thinBorder,
      alignment: { horizontal: 'center', vertical: 'middle' },
    });
    return;
  }

  const st = student.dailyStatus[d.day];
  const styleMap: Record<string, { val: string; text: string; bg: string }> = {
    PRESENT: { val: 'P', text: PALETTE.presentText, bg: PALETTE.presentBg },
    LATE_UNJUSTIFIED: { val: 'TI', text: PALETTE.lateInjText, bg: PALETTE.lateInjBg },
    LATE_JUSTIFIED: { val: 'TJ', text: PALETTE.lateJustText, bg: PALETTE.lateJustBg },
    ABSENT_UNJUSTIFIED: { val: 'FI', text: PALETTE.absentInjText, bg: PALETTE.absentInjBg },
    ABSENT_JUSTIFIED: { val: 'FJ', text: PALETTE.absentJustText, bg: PALETTE.absentJustBg },
  };

  const matched = st ? styleMap[st] : null;
  if (matched) {
    cell.value = matched.val;
    applyStyle(cell, {
      font: { bold: true, size: 8.5, color: { argb: matched.text } },
      fillBg: matched.bg,
      border: thinBorder,
      alignment: { horizontal: 'center', vertical: 'middle' },
    });
  } else {
    cell.value = '';
    applyStyle(cell, {
      fillBg: defaultRowBg,
      border: thinBorder,
      alignment: { horizontal: 'center', vertical: 'middle' },
    });
  }
}

function renderStudentSummaryCells(
  ws: ExcelJS.Worksheet,
  r: number,
  student: AttendanceMatrixStudentRow,
  daysInMonth: number,
  summaryStartCol: number,
): void {
  const dayRange = `${colLetter(5)}${r}:${colLetter(4 + daysInMonth)}${r}`;
  const pColLet = colLetter(summaryStartCol);
  const fjColLet = colLetter(summaryStartCol + 1);
  const fiColLet = colLetter(summaryStartCol + 2);
  const pctColLet = colLetter(summaryStartCol + 4);

  // 1. Total Asistencias (P)
  const cellP = ws.getCell(r, summaryStartCol);
  cellP.value = {
    formula: `COUNTIF(${dayRange},"P")`,
    result: student.counts.PRESENT,
  };
  applyStyle(cellP, {
    font: { bold: true, size: 8.5, color: { argb: PALETTE.presentText } },
    fillBg: PALETTE.summaryP,
    border: thinBorder,
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  // 2. Faltas Justificadas (FJ)
  const cellFJ = ws.getCell(r, summaryStartCol + 1);
  cellFJ.value = {
    formula: `COUNTIF(${dayRange},"FJ")`,
    result: student.counts.ABSENT_JUSTIFIED,
  };
  applyStyle(cellFJ, {
    font: { bold: true, size: 8.5, color: { argb: PALETTE.absentJustText } },
    fillBg: PALETTE.summaryFJ,
    border: thinBorder,
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  // 3. Faltas Injustificadas (FI)
  const cellFI = ws.getCell(r, summaryStartCol + 2);
  cellFI.value = {
    formula: `COUNTIF(${dayRange},"FI")`,
    result: student.counts.ABSENT_UNJUSTIFIED,
  };
  applyStyle(cellFI, {
    font: { bold: true, size: 8.5, color: { argb: PALETTE.absentInjText } },
    fillBg: PALETTE.summaryFI,
    border: thinBorder,
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  // 4. Tardanzas Totales (TI + TJ)
  const cellT = ws.getCell(r, summaryStartCol + 3);
  cellT.value = {
    formula: `COUNTIF(${dayRange},"TI")+COUNTIF(${dayRange},"TJ")`,
    result: student.counts.LATE_UNJUSTIFIED + student.counts.LATE_JUSTIFIED,
  };
  applyStyle(cellT, {
    font: { bold: true, size: 8.5, color: { argb: PALETTE.lateInjText } },
    fillBg: PALETTE.summaryT,
    border: thinBorder,
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  // 5. Porcentaje de Asistencia
  const cellPct = ws.getCell(r, summaryStartCol + 4);
  cellPct.value = {
    formula: `IF((${pColLet}${r}+${fiColLet}${r}+${fjColLet}${r})>0,${pColLet}${r}/(${pColLet}${r}+${fiColLet}${r}+${fjColLet}${r}),0)`,
    result: student.attendanceRate / 100,
  };
  cellPct.numFmt = '0.0%';
  applyStyle(cellPct, {
    font: { bold: true, size: 8.5, color: { argb: PALETTE.navyDark } },
    fillBg: PALETTE.summaryPct,
    border: thinBorder,
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  // 6. Condición / Semáforo de Riesgo
  const cellRisk = ws.getCell(r, summaryStartCol + 5);
  cellRisk.value = {
    formula: `IF(${pctColLet}${r}>=0.85,"NORMAL",IF(${pctColLet}${r}>=0.70,"ALERTA","CRÍTICO"))`,
    result: student.riskLevel === 'NORMAL' ? 'NORMAL' : student.riskLevel === 'WARNING' ? 'ALERTA' : 'CRÍTICO',
  };
  const riskBg =
    student.riskLevel === 'NORMAL'
      ? PALETTE.summaryRiskNormal
      : student.riskLevel === 'WARNING'
        ? PALETTE.summaryRiskWarning
        : PALETTE.summaryRiskCritical;

  applyStyle(cellRisk, {
    font: { bold: true, size: 8, color: { argb: PALETTE.navyDark } },
    fillBg: riskBg,
    border: thinBorder,
    alignment: { horizontal: 'center', vertical: 'middle' },
  });
}

export function renderStudentRows(
  ws: ExcelJS.Worksheet,
  students: AttendanceMatrixStudentRow[],
  days: DayColumnInfo[],
  daysInMonth: number,
  summaryStartCol: number,
  isWithAttendance: boolean,
  classroomLabel: string | undefined,
  startRow: number,
  rowCount: number,
): void {
  for (let idx = 0; idx < rowCount; idx++) {
    const r = startRow + idx;
    const row = ws.getRow(r);
    row.height = 20;

    const student = isWithAttendance && idx < students.length ? students[idx] : null;
    const isEven = idx % 2 === 1;
    const defaultRowBg = isEven ? PALETTE.slateLight : 'FFFFFFFF';

    // Col 1: N°
    const cellNum = ws.getCell(r, 1);
    cellNum.value = idx + 1;
    applyStyle(cellNum, {
      font: { bold: true, size: 8.5, color: { argb: PALETTE.navyDark } },
      fillBg: defaultRowBg,
      border: thinBorder,
      alignment: { horizontal: 'center', vertical: 'middle' },
    });

    // Col 2: Apellidos y Nombres
    const cellStName = ws.getCell(r, 2);
    cellStName.value = student ? student.studentName.toUpperCase() : '';
    applyStyle(cellStName, {
      font: { bold: Boolean(student), size: 9, color: { argb: 'FF000000' } },
      fillBg: defaultRowBg,
      border: thinBorder,
      alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
    });

    // Col 3: DNI
    const cellStDni = ws.getCell(r, 3);
    cellStDni.value = student ? student.documentId : '';
    cellStDni.numFmt = '@';
    applyStyle(cellStDni, {
      font: { size: 8.5, color: { argb: PALETTE.navyDark } },
      fillBg: defaultRowBg,
      border: thinBorder,
      alignment: { horizontal: 'center', vertical: 'middle' },
    });

    // Col 4: Aula
    const cellStClassroom = ws.getCell(r, 4);
    cellStClassroom.value = student ? `${student.grade}° "${student.section}"` : classroomLabel || '';
    applyStyle(cellStClassroom, {
      font: { size: 8.5, color: { argb: PALETTE.navyDark } },
      fillBg: defaultRowBg,
      border: thinBorder,
      alignment: { horizontal: 'center', vertical: 'middle' },
    });

    // Casillas de los Días
    days.forEach((d, dayIdx) => {
      const col = 5 + dayIdx;
      renderDayCell(ws.getCell(r, col), d, isWithAttendance, student, defaultRowBg);
    });

    if (isWithAttendance && student) {
      renderStudentSummaryCells(ws, r, student, daysInMonth, summaryStartCol);
    } else {
      for (let sc = 0; sc < 6; sc++) {
        const c = ws.getCell(r, summaryStartCol + sc);
        c.value = '';
        applyStyle(c, {
          fillBg: 'FFFFFFFF',
          border: thinBorder,
          alignment: { horizontal: 'center', vertical: 'middle' },
        });
      }
    }
  }
}
