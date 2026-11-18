import type ExcelJS from 'exceljs';
import { addSchoolLogoToWorkbook } from '@/lib/excelLogo';
import { downloadBlob } from '@/lib/download';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** La librería de Excel (pesada) se descarga solo cuando se genera un archivo. */
export const newWorkbook = async (): Promise<ExcelJS.Workbook> => new (await import('exceljs')).default.Workbook();

/** Combina un rango en la hoja garantizando que no sea degenerado o invertido */
export const safeMerge = (ws: ExcelJS.Worksheet, top: number, left: number, bottom: number, right: number): void => {
  if (top <= bottom && left <= right && (top !== bottom || left !== right)) {
    ws.mergeCells(top, left, bottom, right);
  }
};

/** Aplica estilos en lote a un rango de celdas (incluso si está combinado) */
export const styleRange = (
  ws: ExcelJS.Worksheet,
  top: number,
  left: number,
  bottom: number,
  right: number,
  style: {
    font?: Partial<ExcelJS.Font>;
    fill?: ExcelJS.Fill;
    border?: Partial<ExcelJS.Borders>;
    alignment?: Partial<ExcelJS.Alignment>;
    numFmt?: string;
  },
): void => {
  for (let r = top; r <= bottom; r++) {
    for (let c = left; c <= right; c++) {
      const cell = ws.getCell(r, c);
      if (style.font) cell.font = { ...cell.font, ...style.font };
      if (style.fill) cell.fill = style.fill;
      if (style.border) cell.border = style.border;
      if (style.alignment) cell.alignment = { ...cell.alignment, ...style.alignment };
      if (style.numFmt) cell.numFmt = style.numFmt;
    }
  }
};

/** Sanitiza números para evitar NaN, null o undefined en celdas de Excel */
export const safeNumber = (val: unknown, decimals?: number): number | '' => {
  if (val === null || val === undefined || val === '') return '';
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return '';
  return decimals !== undefined ? Number(num.toFixed(decimals)) : num;
};

/** Convierte un índice de columna numérico (1-based) a letra de Excel (ej: 1 -> A, 27 -> AA, 703 -> AAA) */
export function colLetter(colIdx: number): string {
  let temp = colIdx;
  let letter = '';
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

/** Descarga en el navegador el libro Excel como archivo .xlsx nativo con logo */
export const saveWorkbook = async (workbook: ExcelJS.Workbook, filename: string): Promise<void> => {
  await addSchoolLogoToWorkbook(workbook);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: XLSX_MIME });
  downloadBlob(blob, filename);
};

export function solidFill(argb: string): ExcelJS.Fill {
  return {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb },
  };
}

export function thinBorders(argb: string): Partial<ExcelJS.Borders> {
  return {
    top: { style: 'thin', color: { argb } },
    left: { style: 'thin', color: { argb } },
    bottom: { style: 'thin', color: { argb } },
    right: { style: 'thin', color: { argb } },
  };
}
