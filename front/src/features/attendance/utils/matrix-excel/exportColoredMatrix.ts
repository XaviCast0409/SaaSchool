import { newWorkbook, saveWorkbook } from '@/lib/excel/base';
import { getDayInfo, formatMonthSpanish } from '@/lib/calendarDates';
import { MarkedMatrixExportParams, DayColumnInfo } from './types';
import { renderInstitutionalHeader, renderTableHeaders, renderLegendAndSignatures } from './sections';
import { renderStudentRows } from './studentRows';
import { renderDailyTotals } from './dailyTotals';

export async function exportWellMarkedMatrixExcel(params: MarkedMatrixExportParams): Promise<void> {
  const { students, monthStr, daysInMonth, classroomLabel, schoolName = 'INSTITUCIÓN EDUCATIVA', mode } = params;

  const [yearNum, monthNum] = monthStr.split('-').map(Number);
  const periodText = formatMonthSpanish(monthStr).toUpperCase();

  const days: DayColumnInfo[] = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const info = getDayInfo(yearNum, monthNum, day);
    return { day, ...info };
  });

  const isWithAttendance = mode === 'WITH_ATTENDANCE';
  const totalCols = 4 + daysInMonth + 6;

  const workbook = await newWorkbook();
  workbook.creator = 'KIPUX';
  workbook.lastModifiedBy = 'KIPUX';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheetName = isWithAttendance
    ? `Asistencia ${classroomLabel || 'Sección'}`.slice(0, 31)
    : `Plantilla Vacía ${monthStr}`.slice(0, 31);

  const ws = workbook.addWorksheet(sheetName, {
    views: [
      {
        state: 'frozen',
        xSplit: 4,
        ySplit: 6,
        activeCell: 'E7',
        showGridLines: true,
      },
    ],
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: '1:6',
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

  ws.getColumn(1).width = 5.5;
  ws.getColumn(2).width = 33.0;
  ws.getColumn(3).width = 13.0;
  ws.getColumn(4).width = 11.0;

  for (let c = 5; c <= 4 + daysInMonth; c++) {
    ws.getColumn(c).width = 4.4;
  }

  const summaryStartCol = 5 + daysInMonth;
  ws.getColumn(summaryStartCol).width = 8.5;
  ws.getColumn(summaryStartCol + 1).width = 8.5;
  ws.getColumn(summaryStartCol + 2).width = 8.5;
  ws.getColumn(summaryStartCol + 3).width = 9.0;
  ws.getColumn(summaryStartCol + 4).width = 9.5;
  ws.getColumn(summaryStartCol + 5).width = 11.5;

  renderInstitutionalHeader(
    ws,
    totalCols,
    isWithAttendance,
    schoolName,
    classroomLabel,
    periodText,
    students.length,
  );

  renderTableHeaders(ws, days, daysInMonth, periodText, summaryStartCol);

  const rowCount = isWithAttendance ? Math.max(students.length, 1) : 35;
  const startRow = 7;
  renderStudentRows(
    ws,
    students,
    days,
    daysInMonth,
    summaryStartCol,
    isWithAttendance,
    classroomLabel,
    startRow,
    rowCount,
  );

  const lastStudentRow = startRow + rowCount - 1;
  const totRowP = lastStudentRow + 1;
  const totRowT = lastStudentRow + 2;
  const totRowF = lastStudentRow + 3;
  const totRowPct = lastStudentRow + 4;

  if (isWithAttendance) {
    renderDailyTotals(
      ws,
      days,
      startRow,
      lastStudentRow,
      totRowP,
      totRowT,
      totRowF,
      totRowPct,
      summaryStartCol,
    );
  }

  const bottomStartRow = isWithAttendance ? totRowPct + 3 : lastStudentRow + 3;
  renderLegendAndSignatures(ws, bottomStartRow, totalCols);

  const safeClassroom = (classroomLabel || 'Seccion').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = isWithAttendance
    ? `Registro_Asistencia_${safeClassroom}_${monthStr}.xlsx`
    : `Plantilla_Vacia_Control_Manual_${monthStr}.xlsx`;

  await saveWorkbook(workbook, filename);
}

export const exportMatrixColoredExcel = async (
  params: Omit<MarkedMatrixExportParams, 'mode'>,
): Promise<void> => {
  await exportWellMarkedMatrixExcel({
    ...params,
    mode: 'WITH_ATTENDANCE',
  });
};
