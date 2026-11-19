import type ExcelJS from 'exceljs';

export const PALETTE = {
  navyDark: 'FF0F172A', // Slate 900
  navyBlue: 'FF1E3A8A', // Blue 900
  iceBlue: 'FFEFF6FF', // Blue 50
  slateLight: 'FFF8FAFC', // Slate 50
  slateBorder: 'FFCBD5E1', // Slate 300
  slateBorderDark: 'FF94A3B8', // Slate 400
  headerDayBg: 'FF334155', // Slate 700
  headerDayText: 'FFFFFFFF', // Blanco
  headerSummaryBg: 'FF0F766E', // Teal 700
  headerSummarySubBg: 'FF115E59', // Teal 800

  // Estados Asistencia
  presentBg: 'FFDCFCE7', // Emerald 100
  presentText: 'FF166534', // Emerald 800
  lateInjBg: 'FFFFEDD5', // Orange 100
  lateInjText: 'FF9A3412', // Orange 800
  lateJustBg: 'FFE0F2FE', // Sky 100
  lateJustText: 'FF075985', // Sky 800
  absentInjBg: 'FFFEE2E2', // Red 100
  absentInjText: 'FF991B1B', // Red 800
  absentJustBg: 'FFFEF3C7', // Amber 100
  absentJustText: 'FF92400E', // Amber 800

  // Fines de semana
  weekendBg: 'FFE2E8F0', // Slate 200
  weekendText: 'FF64748B', // Slate 500

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

export const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: PALETTE.slateBorder } },
  left: { style: 'thin', color: { argb: PALETTE.slateBorder } },
  bottom: { style: 'thin', color: { argb: PALETTE.slateBorder } },
  right: { style: 'thin', color: { argb: PALETTE.slateBorder } },
};

export const headerCellBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: PALETTE.slateBorderDark } },
  left: { style: 'thin', color: { argb: PALETTE.slateBorderDark } },
  bottom: { style: 'medium', color: { argb: PALETTE.navyDark } },
  right: { style: 'thin', color: { argb: PALETTE.slateBorderDark } },
};

export function applyStyle(
  cell: ExcelJS.Cell,
  options: {
    font?: Partial<ExcelJS.Font>;
    fillBg?: string;
    border?: Partial<ExcelJS.Borders>;
    alignment?: Partial<ExcelJS.Alignment>;
    numFmt?: string;
  },
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
