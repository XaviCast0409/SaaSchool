import ExcelJS from 'exceljs';
import { AttendanceMatrixStudentRow } from '../types';

export interface MarkedMatrixExportParams {
  students: AttendanceMatrixStudentRow[];
  monthStr: string;
  daysInMonth: number;
  classroomLabel?: string;
  schoolName?: string;
  mode: 'WITH_ATTENDANCE' | 'EMPTY';
}

const SPANISH_MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const SPANISH_DAYS_SHORT = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

function formatMonthSpanish(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  const monthName = SPANISH_MONTHS[month - 1] || 'MES';
  return `${monthName.toUpperCase()} ${year}`;
}

function getDayInfo(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day);
  const dayIndex = date.getDay();
  return {
    short: SPANISH_DAYS_SHORT[dayIndex],
    isWeekend: dayIndex === 0 || dayIndex === 6,
    isSunday: dayIndex === 0,
  };
}

/**
 * Convierte un índice de columna numérico (1-based) a letra de Excel (ej: 1 -> A, 27 -> AA)
 */
function colLetter(colIdx: number): string {
  let temp = colIdx;
  let letter = '';
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

const PALETTE = {
  navyDark: 'FF0F172A',        // Slate 900
  navyBlue: 'FF1E3A8A',        // Blue 900
  iceBlue: 'FFEFF6FF',         // Blue 50
  slateLight: 'FFF8FAFC',      // Slate 50
  slateBorder: 'FFCBD5E1',     // Slate 300
  slateBorderDark: 'FF94A3B8', // Slate 400
  headerDayBg: 'FF334155',     // Slate 700
  headerDayText: 'FFFFFFFF',   // Blanco
  headerSummaryBg: 'FF0F766E', // Teal 700
  headerSummarySubBg: 'FF115E59', // Teal 800

  // Estados Asistencia
  presentBg: 'FFDCFCE7',       // Emerald 100
  presentText: 'FF166534',     // Emerald 800
  lateInjBg: 'FFFFEDD5',       // Orange 100
  lateInjText: 'FF9A3412',     // Orange 800
  lateJustBg: 'FFE0F2FE',      // Sky 100
  lateJustText: 'FF075985',     // Sky 800
  absentInjBg: 'FFFEE2E2',     // Red 100
  absentInjText: 'FF991B1B',   // Red 800
  absentJustBg: 'FFFEF3C7',    // Amber 100
  absentJustText: 'FF92400E',   // Amber 800

  // Fines de semana
  weekendBg: 'FFE2E8F0',       // Slate 200
  weekendText: 'FF64748B',     // Slate 500

  // Resumen
  summaryP: 'FFECFDF5',
  summaryFJ: 'FFFFFBEB',
  summaryFI: 'FFFEF2F2',
  summaryT: 'FFFFF7ED',
  summaryPct: 'FFF0FDF4',
  summaryRiskNormal: 'FFDCFCE7',
  summaryRiskWarning: 'FFFEF3C7',
  summaryRiskCritical: 'FFFEE2E2',
};

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: PALETTE.slateBorder } },
  left: { style: 'thin', color: { argb: PALETTE.slateBorder } },
  bottom: { style: 'thin', color: { argb: PALETTE.slateBorder } },
  right: { style: 'thin', color: { argb: PALETTE.slateBorder } },
};

const headerCellBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: PALETTE.slateBorderDark } },
  left: { style: 'thin', color: { argb: PALETTE.slateBorderDark } },
  bottom: { style: 'medium', color: { argb: PALETTE.navyDark } },
  right: { style: 'thin', color: { argb: PALETTE.slateBorderDark } },
};

function applyStyle(
  cell: ExcelJS.Cell,
  options: {
    font?: Partial<ExcelJS.Font>;
    fillBg?: string;
    border?: Partial<ExcelJS.Borders>;
    alignment?: Partial<ExcelJS.Alignment>;
    numFmt?: string;
  }
) {
  if (options.font) cell.font = { name: 'Segoe UI', ...options.font };
  if (options.fillBg) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: options.fillBg },
    };
  }
  if (options.border) cell.border = options.border;
  if (options.alignment) cell.alignment = options.alignment;
  if (options.numFmt) cell.numFmt = options.numFmt;
}

const saveWorkbook = async (workbook: ExcelJS.Workbook, filename: string): Promise<void> => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

/**
 * Exporta el Registro Auxiliar de Asistencia en formato Excel (.xlsx) nativo
 * utilizando ExcelJS con cuadrícula ejecutiva, fórmulas dinámicas de conteo,
 * congelamiento de paneles y preparación para impresión oficial horizontal.
 */
export async function exportWellMarkedMatrixExcel(params: MarkedMatrixExportParams): Promise<void> {
  const {
    students,
    monthStr,
    daysInMonth,
    classroomLabel,
    schoolName = 'INSTITUCIÓN EDUCATIVA',
    mode,
  } = params;

  const [yearNum, monthNum] = monthStr.split('-').map(Number);
  const periodText = formatMonthSpanish(monthStr);

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const info = getDayInfo(yearNum, monthNum, day);
    return { day, ...info };
  });

  const isWithAttendance = mode === 'WITH_ATTENDANCE';
  const totalCols = 4 + daysInMonth + 6; // N°, Nombre, DNI, Aula + Días + 6 Columnas de Resumen

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SaaSchool';
  workbook.lastModifiedBy = 'SaaSchool';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheetName = isWithAttendance
    ? `Asistencia ${classroomLabel || 'Sección'}`.slice(0, 31)
    : `Plantilla Vacía ${monthStr}`.slice(0, 31);

  const ws = workbook.addWorksheet(sheetName, {
    views: [
      {
        state: 'frozen',
        xSplit: 4, // Inmovilizar N°, Nombre, DNI, Aula
        ySplit: 6, // Inmovilizar filas 1 a 6 de cabecera
        activeCell: 'E7',
        showGridLines: true,
      },
    ],
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: '1:6', // Repite filas 1 a 6 en todas las páginas impresas
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.4,
        bottom: 0.4,
        header: 0.2,
        footer: 0.2,
      },
    },
  });

  // Configurar anchos de columna base
  ws.getColumn(1).width = 5.5;  // N°
  ws.getColumn(2).width = 33.0; // Estudiante
  ws.getColumn(3).width = 13.0; // DNI
  ws.getColumn(4).width = 11.0; // Aula

  for (let c = 5; c <= 4 + daysInMonth; c++) {
    ws.getColumn(c).width = 4.4; // Días del mes (compacto para A4 horizontal)
  }

  const summaryStartCol = 5 + daysInMonth;
  ws.getColumn(summaryStartCol).width = 8.5;     // P
  ws.getColumn(summaryStartCol + 1).width = 8.5; // FJ
  ws.getColumn(summaryStartCol + 2).width = 8.5; // FI
  ws.getColumn(summaryStartCol + 3).width = 9.0; // T
  ws.getColumn(summaryStartCol + 4).width = 9.5; // % Asist.
  ws.getColumn(summaryStartCol + 5).width = 11.5; // Condición

  // ==========================================================================
  // FILA 1: Encabezado Institucional Supremo (República del Perú)
  // ==========================================================================
  ws.mergeCells(1, 1, 1, totalCols);
  const row1 = ws.getRow(1);
  row1.height = 24;
  const cell1 = ws.getCell(1, 1);
  cell1.value = 'REPÚBLICA DEL PERÚ • MINISTERIO DE EDUCACIÓN';
  applyStyle(cell1, {
    font: { bold: true, size: 10.5, color: { argb: 'FFFFFFFF' } },
    fillBg: PALETTE.navyDark,
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  // ==========================================================================
  // FILA 2: Título Oficial del Registro
  // ==========================================================================
  ws.mergeCells(2, 1, 2, totalCols);
  const row2 = ws.getRow(2);
  row2.height = 26;
  const cell2 = ws.getCell(2, 1);
  cell2.value = isWithAttendance
    ? 'REGISTRO AUXILIAR MENSUAL DE ASISTENCIA Y PERMANENCIA ESCOLAR (SIAGIE)'
    : 'REGISTRO AUXILIAR DE CONTROL DIARIO DE ASISTENCIA (PLANTILLA PARA LLENADO MANUAL)';
  applyStyle(cell2, {
    font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
    fillBg: PALETTE.navyBlue,
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  // ==========================================================================
  // FILA 3: Barra de Metadatos del Colegio y Sección
  // ==========================================================================
  ws.mergeCells(3, 1, 3, totalCols);
  const row3 = ws.getRow(3);
  row3.height = 22;
  const cell3 = ws.getCell(3, 1);
  const now = new Date();
  const emissionDate = now.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  cell3.value = `I.E.: ${schoolName.toUpperCase()}   |   AULA / SECCIÓN: ${(classroomLabel || 'TODAS LAS SECCIONES').toUpperCase()}   |   MES: ${periodText}   |   EMISIÓN: ${emissionDate}   |   ESTUDIANTES: ${students.length}`;
  applyStyle(cell3, {
    font: { bold: true, size: 9, color: { argb: PALETTE.navyDark } },
    fillBg: PALETTE.iceBlue,
    border: thinBorder,
    alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
  });

  // ==========================================================================
  // FILA 4: Separador Estético
  // ==========================================================================
  const row4 = ws.getRow(4);
  row4.height = 6;

  // ==========================================================================
  // FILAS 5 Y 6: Cabeceras de Columnas
  // ==========================================================================
  const row5 = ws.getRow(5);
  row5.height = 20;
  const row6 = ws.getRow(6);
  row6.height = 24;

  // Columna N° (Filas 5-6 combinadas)
  ws.mergeCells(5, 1, 6, 1);
  const cellN = ws.getCell(5, 1);
  cellN.value = 'N°';
  applyStyle(cellN, {
    font: { bold: true, size: 9, color: { argb: 'FFFFFFFF' } },
    fillBg: PALETTE.navyDark,
    border: headerCellBorder,
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  // Columna Apellidos y Nombres (Filas 5-6 combinadas)
  ws.mergeCells(5, 2, 6, 2);
  const cellName = ws.getCell(5, 2);
  cellName.value = 'APELLIDOS Y NOMBRES DEL ESTUDIANTE';
  applyStyle(cellName, {
    font: { bold: true, size: 9, color: { argb: 'FFFFFFFF' } },
    fillBg: PALETTE.navyDark,
    border: headerCellBorder,
    alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
  });

  // Columna DNI (Filas 5-6 combinadas)
  ws.mergeCells(5, 3, 6, 3);
  const cellDni = ws.getCell(5, 3);
  cellDni.value = 'DNI';
  applyStyle(cellDni, {
    font: { bold: true, size: 9, color: { argb: 'FFFFFFFF' } },
    fillBg: PALETTE.navyDark,
    border: headerCellBorder,
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  // Columna Aula (Filas 5-6 combinadas)
  ws.mergeCells(5, 4, 6, 4);
  const cellClassroom = ws.getCell(5, 4);
  cellClassroom.value = 'AULA';
  applyStyle(cellClassroom, {
    font: { bold: true, size: 9, color: { argb: 'FFFFFFFF' } },
    fillBg: PALETTE.navyDark,
    border: headerCellBorder,
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  // Fila 5: Cabecera Agrupada de Días
  ws.mergeCells(5, 5, 5, 4 + daysInMonth);
  const cellDaysHeader = ws.getCell(5, 5);
  cellDaysHeader.value = `DÍAS DEL MES • ${periodText}`;
  applyStyle(cellDaysHeader, {
    font: { bold: true, size: 9, color: { argb: 'FFFFFFFF' } },
    fillBg: PALETTE.headerDayBg,
    border: headerCellBorder,
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  // Fila 6: Sub-cabeceras de cada día (Día de la semana + número)
  days.forEach((d, idx) => {
    const col = 5 + idx;
    const cell = ws.getCell(6, col);
    cell.value = `${d.short}\n${String(d.day).padStart(2, '0')}`;
    applyStyle(cell, {
      font: {
        bold: true,
        size: 7.5,
        color: { argb: d.isWeekend ? PALETTE.navyDark : PALETTE.headerDayText },
      },
      fillBg: d.isWeekend ? PALETTE.slateBorderDark : PALETTE.headerDayBg,
      border: thinBorder,
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    });
  });

  // Fila 5: Cabecera Agrupada de Resumen
  ws.mergeCells(5, summaryStartCol, 5, summaryStartCol + 5);
  const cellSummaryHeader = ws.getCell(5, summaryStartCol);
  cellSummaryHeader.value = 'RESUMEN ACUMULADO DEL MES';
  applyStyle(cellSummaryHeader, {
    font: { bold: true, size: 9, color: { argb: 'FFFFFFFF' } },
    fillBg: PALETTE.headerSummaryBg,
    border: headerCellBorder,
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  // Fila 6: Sub-cabeceras de Resumen
  const summaryHeaders = [
    { label: 'ASIST.\n(P)', col: summaryStartCol },
    { label: 'FALTAS\nJUST.(FJ)', col: summaryStartCol + 1 },
    { label: 'FALTAS\nINJ.(FI)', col: summaryStartCol + 2 },
    { label: 'TARD.\n(TI+TJ)', col: summaryStartCol + 3 },
    { label: '% ASIST.\nMENSUAL', col: summaryStartCol + 4 },
    { label: 'ESTADO /\nRIESGO', col: summaryStartCol + 5 },
  ];

  summaryHeaders.forEach((sh) => {
    const cell = ws.getCell(6, sh.col);
    cell.value = sh.label;
    applyStyle(cell, {
      font: { bold: true, size: 7.5, color: { argb: 'FFFFFFFF' } },
      fillBg: PALETTE.headerSummarySubBg,
      border: thinBorder,
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    });
  });

  // ==========================================================================
  // FILAS 7 EN ADELANTE: Filas de Estudiantes
  // ==========================================================================
  const rowCount = isWithAttendance ? Math.max(students.length, 1) : 35;
  const startRow = 7;

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
    cellStDni.numFmt = '@'; // Texto plano para preservar ceros a la izquierda
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

    // Casillas de los Días (Col 5 .. 4+daysInMonth)
    days.forEach((d, dayIdx) => {
      const col = 5 + dayIdx;
      const cell = ws.getCell(r, col);

      if (d.isWeekend) {
        cell.value = d.isSunday ? 'D' : 'S';
        applyStyle(cell, {
          font: { bold: true, size: 8, color: { argb: PALETTE.weekendText } },
          fillBg: PALETTE.weekendBg,
          border: thinBorder,
          alignment: { horizontal: 'center', vertical: 'middle' },
        });
      } else if (isWithAttendance && student) {
        const st = student.dailyStatus[d.day];
        if (st === 'PRESENT') {
          cell.value = 'P';
          applyStyle(cell, {
            font: { bold: true, size: 8.5, color: { argb: PALETTE.presentText } },
            fillBg: PALETTE.presentBg,
            border: thinBorder,
            alignment: { horizontal: 'center', vertical: 'middle' },
          });
        } else if (st === 'LATE_UNJUSTIFIED') {
          cell.value = 'TI';
          applyStyle(cell, {
            font: { bold: true, size: 8.5, color: { argb: PALETTE.lateInjText } },
            fillBg: PALETTE.lateInjBg,
            border: thinBorder,
            alignment: { horizontal: 'center', vertical: 'middle' },
          });
        } else if (st === 'LATE_JUSTIFIED') {
          cell.value = 'TJ';
          applyStyle(cell, {
            font: { bold: true, size: 8.5, color: { argb: PALETTE.lateJustText } },
            fillBg: PALETTE.lateJustBg,
            border: thinBorder,
            alignment: { horizontal: 'center', vertical: 'middle' },
          });
        } else if (st === 'ABSENT_UNJUSTIFIED') {
          cell.value = 'FI';
          applyStyle(cell, {
            font: { bold: true, size: 8.5, color: { argb: PALETTE.absentInjText } },
            fillBg: PALETTE.absentInjBg,
            border: thinBorder,
            alignment: { horizontal: 'center', vertical: 'middle' },
          });
        } else if (st === 'ABSENT_JUSTIFIED') {
          cell.value = 'FJ';
          applyStyle(cell, {
            font: { bold: true, size: 8.5, color: { argb: PALETTE.absentJustText } },
            fillBg: PALETTE.absentJustBg,
            border: thinBorder,
            alignment: { horizontal: 'center', vertical: 'middle' },
          });
        } else {
          // Vacío / Pendiente
          cell.value = '';
          applyStyle(cell, {
            fillBg: defaultRowBg,
            border: thinBorder,
            alignment: { horizontal: 'center', vertical: 'middle' },
          });
        }
      } else {
        // Modo Plantilla Vacía para llenado manual
        cell.value = '';
        applyStyle(cell, {
          fillBg: 'FFFFFFFF',
          border: thinBorder,
          alignment: { horizontal: 'center', vertical: 'middle' },
        });
      }
    });

    // Columnas de Resumen para el Estudiante (Con Fórmulas Dinámicas de Excel)
    const dayRange = `${colLetter(5)}${r}:${colLetter(4 + daysInMonth)}${r}`;
    const pColLet = colLetter(summaryStartCol);
    const fjColLet = colLetter(summaryStartCol + 1);
    const fiColLet = colLetter(summaryStartCol + 2);
    const pctColLet = colLetter(summaryStartCol + 4);

    if (isWithAttendance && student) {
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
      const riskBg = student.riskLevel === 'NORMAL'
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
    } else {
      // Casillas de resumen vacías para modo plantilla
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

  // ==========================================================================
  // FILAS TOTALES DE PIE DE TABLA (Resumen Diario por Columna)
  // ==========================================================================
  const lastStudentRow = startRow + rowCount - 1;
  const totRowP = lastStudentRow + 1;
  const totRowT = lastStudentRow + 2;
  const totRowF = lastStudentRow + 3;
  const totRowPct = lastStudentRow + 4;

  if (isWithAttendance) {
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

  // ==========================================================================
  // BLOQUE INFERIOR: Leyenda Oficial MINEDU y Firmas Institucionales
  // ==========================================================================
  const bottomStartRow = isWithAttendance ? totRowPct + 3 : lastStudentRow + 3;

  // Leyenda
  ws.mergeCells(bottomStartRow, 2, bottomStartRow, 14);
  const legendTitle = ws.getCell(bottomStartRow, 2);
  legendTitle.value = 'LEYENDA OFICIAL DE CONVENCIÓN MINEDU / SIAGIE:';
  applyStyle(legendTitle, {
    font: { bold: true, size: 8.5, color: { argb: PALETTE.navyDark } },
  });

  const legendItems = [
    { code: 'P', label: 'Asistencia Puntual' },
    { code: 'TI', label: 'Tardanza Injustificada' },
    { code: 'TJ', label: 'Tardanza Justificada' },
    { code: 'FI', label: 'Falta Injustificada' },
    { code: 'FJ', label: 'Falta Justificada' },
    { code: 'S / D', label: 'Fin de Semana (Sábado / Domingo)' },
  ];

  legendItems.forEach((item, lIdx) => {
    const row = bottomStartRow + 1 + lIdx;
    ws.mergeCells(row, 2, row, 14);
    const cell = ws.getCell(row, 2);
    cell.value = `[ ${item.code} ] : ${item.label}`;
    applyStyle(cell, {
      font: { size: 8, color: { argb: 'FF334155' } },
    });
  });

  // Firmas Institucionales
  const sigRow = bottomStartRow + 4;
  const sigColTutorStart = 16;
  const sigColTutorEnd = 24;
  const sigColDirectorStart = 27;
  const sigColDirectorEnd = Math.min(36, totalCols - 1);

  ws.mergeCells(sigRow, sigColTutorStart, sigRow, sigColTutorEnd);
  const sigTutorLine = ws.getCell(sigRow, sigColTutorStart);
  sigTutorLine.value = 'DOCENTE TUTOR(A) / RESPONSABLE';
  applyStyle(sigTutorLine, {
    font: { bold: true, size: 8.5, color: { argb: PALETTE.navyDark } },
    border: { top: { style: 'medium', color: { argb: 'FF0F172A' } } },
    alignment: { horizontal: 'center', vertical: 'top' },
  });

  ws.mergeCells(sigRow + 1, sigColTutorStart, sigRow + 1, sigColTutorEnd);
  const sigTutorSub = ws.getCell(sigRow + 1, sigColTutorStart);
  sigTutorSub.value = 'Firma y Sello de Aula';
  applyStyle(sigTutorSub, {
    font: { size: 7.5, color: { argb: 'FF64748B' } },
    alignment: { horizontal: 'center', vertical: 'top' },
  });

  ws.mergeCells(sigRow, sigColDirectorStart, sigRow, sigColDirectorEnd);
  const sigDirLine = ws.getCell(sigRow, sigColDirectorStart);
  sigDirLine.value = 'DIRECCIÓN / SUBDIRECCIÓN ACADÉMICA';
  applyStyle(sigDirLine, {
    font: { bold: true, size: 8.5, color: { argb: PALETTE.navyDark } },
    border: { top: { style: 'medium', color: { argb: 'FF0F172A' } } },
    alignment: { horizontal: 'center', vertical: 'top' },
  });

  ws.mergeCells(sigRow + 1, sigColDirectorStart, sigRow + 1, sigColDirectorEnd);
  const sigDirSub = ws.getCell(sigRow + 1, sigColDirectorStart);
  sigDirSub.value = 'V° B° y Sello Institucional Oficial';
  applyStyle(sigDirSub, {
    font: { size: 7.5, color: { argb: 'FF64748B' } },
    alignment: { horizontal: 'center', vertical: 'top' },
  });

  // Guardar archivo .xlsx
  const safeClassroom = (classroomLabel || 'Seccion').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = isWithAttendance
    ? `Registro_Asistencia_${safeClassroom}_${monthStr}.xlsx`
    : `Plantilla_Vacia_Control_Manual_${monthStr}.xlsx`;

  await saveWorkbook(workbook, filename);
}

// Retrocompatibilidad
export const exportBlankMatrixExcel = async (params: any) => {
  await exportWellMarkedMatrixExcel({
    ...params,
    mode: params.includeStudentNames ? 'WITH_ATTENDANCE' : 'EMPTY',
  });
};

export const exportMatrixColoredExcel = async (params: any) => {
  await exportWellMarkedMatrixExcel({
    ...params,
    mode: 'WITH_ATTENDANCE',
  });
};
