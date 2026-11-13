import ExcelJS from 'exceljs';

/**
 * Exportación genérica a Excel para el contador: una o varias hojas con encabezado del colegio,
 * columnas tipadas (montos en soles con formato contable, fechas) y fila de totales.
 */

export type ColumnType = 'text' | 'money' | 'number' | 'date' | 'datetime';

export interface ExcelColumn<Row> {
  header: string;
  width?: number;
  type?: ColumnType;
  value: (row: Row) => string | number | Date | null | undefined;
  /** Si es true, se suma en la fila de totales (solo money/number). */
  total?: boolean;
}

export interface ExcelSheet<Row = unknown> {
  name: string;
  title: string;
  subtitle?: string;
  columns: ExcelColumn<Row>[];
  rows: Row[];
}

const HEADER_BG = 'FF1E3A8A';
const MONEY_FMT = '"S/" #,##0.00;[Red]-"S/" #,##0.00';

const toDate = (v: unknown) => {
  if (v instanceof Date) return v;
  if (typeof v === 'string' && v) {
    // Fechas solo-día (YYYY-MM-DD) se dejan a medianoche local para que Excel no las mueva
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [y, m, d] = v.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date(v);
  }
  return null;
};

export async function exportFinanceExcel(fileName: string, schoolName: string, sheets: ExcelSheet<any>[]): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SaaSchool';
  wb.created = new Date();

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name.slice(0, 31), { views: [{ state: 'frozen', ySplit: 4 }] });
    const n = sheet.columns.length;

    ws.mergeCells(1, 1, 1, n);
    ws.getCell(1, 1).value = schoolName;
    ws.getCell(1, 1).font = { bold: true, size: 13 };
    ws.mergeCells(2, 1, 2, n);
    ws.getCell(2, 1).value = sheet.title + (sheet.subtitle ? ` — ${sheet.subtitle}` : '');
    ws.getCell(2, 1).font = { bold: true, size: 11, color: { argb: HEADER_BG } };
    ws.mergeCells(3, 1, 3, n);
    ws.getCell(3, 1).value = `Generado el ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}`;
    ws.getCell(3, 1).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };

    const header = ws.getRow(4);
    sheet.columns.forEach((c, i) => {
      const cell = header.getCell(i + 1);
      cell.value = c.header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
      cell.alignment = { vertical: 'middle', wrapText: true };
      ws.getColumn(i + 1).width = c.width ?? (c.type === 'money' ? 14 : 18);
    });
    header.height = 22;

    sheet.rows.forEach((row, r) => {
      const xr = ws.getRow(5 + r);
      sheet.columns.forEach((c, i) => {
        const raw = c.value(row);
        const cell = xr.getCell(i + 1);
        if (raw === null || raw === undefined || raw === '') {
          cell.value = null;
        } else if (c.type === 'money' || c.type === 'number') {
          cell.value = Number(raw);
          if (c.type === 'money') cell.numFmt = MONEY_FMT;
        } else if (c.type === 'date' || c.type === 'datetime') {
          cell.value = toDate(raw);
          cell.numFmt = c.type === 'date' ? 'dd/mm/yyyy' : 'dd/mm/yyyy hh:mm';
        } else {
          cell.value = String(raw);
        }
      });
    });

    if (sheet.columns.some((c) => c.total) && sheet.rows.length > 0) {
      const tr = ws.getRow(5 + sheet.rows.length);
      tr.getCell(1).value = 'TOTAL';
      sheet.columns.forEach((c, i) => {
        if (!c.total) return;
        const col = ws.getColumn(i + 1).letter;
        const cell = tr.getCell(i + 1);
        cell.value = { formula: `SUM(${col}5:${col}${4 + sheet.rows.length})` };
        if (c.type === 'money') cell.numFmt = MONEY_FMT;
      });
      tr.font = { bold: true };
      tr.eachCell((cell) => {
        cell.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
      });
    }
    ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + sheet.rows.length, column: n } };
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}
