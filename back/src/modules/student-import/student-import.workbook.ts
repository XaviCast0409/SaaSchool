import ExcelJS from 'exceljs';
import { XlsxWorkbook, cellRef, normalizeLabel, numToCol, splitRef } from '../siagie/xlsx-xml';
import {
  COLUMN_KEYS, DATA_SHEET_NAME, EXAMPLE_MARKER, GROUP_LABEL, IMPORT_COLUMNS, REJECTION_HEADER,
  type ColumnGroup, type ColumnKey, type RawRow,
} from './student-import.columns';

/** Lectura y escritura del Excel de carga masiva (plantilla, archivo del colegio y filas rechazadas). */

const HEADER_ROW = 2;
const FIRST_DATA_ROW = 3;
const LAST_VALIDATED_ROW = 3000;
export const MAX_IMPORT_ROWS = 3000;

const GROUP_COLOR: Record<ColumnGroup, string> = {
  STUDENT: 'FF1D4ED8',
  ENROLLMENT: 'FF0F766E',
  GUARDIAN: 'FF7C3AED',
  SECOND_GUARDIAN: 'FF64748B',
};
const REQUIRED_FILL = 'FFFEF3C7';
const OPTIONAL_FILL = 'FFF1F5F9';
const THIN: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FFCBD5E1' } };
const BORDER: Partial<ExcelJS.Borders> = { top: THIN, bottom: THIN, left: THIN, right: THIN };
/** Columnas que deben quedar como texto para no perder ceros a la izquierda ni cambiar fechas. */
const TEXT_COLUMNS = new Set<ColumnKey>([
  'documentId', 'birthDate', 'studentCode', 'previousSchoolModularCode', 'residenceUbigeo', 'birthUbigeo',
  'guardianDocumentId', 'guardianCellphone', 'guardian2DocumentId', 'guardian2Cellphone',
]);

export interface TemplateInput {
  schoolName: string;
  year: number;
  classroomLabels: string[];
  /** Si se envía, el archivo es el de filas rechazadas: trae esos datos y el motivo de cada una. */
  rejected?: Array<{ raw: RawRow; reason: string }>;
}

interface DataValidationsApi { add: (range: string, validation: ExcelJS.DataValidation) => void }

function addListsSheet(workbook: ExcelJS.Workbook, classroomLabels: string[]): Map<ColumnKey, string> {
  const sheet = workbook.addWorksheet('Listas', { state: 'hidden' });
  const ranges = new Map<ColumnKey, string>();
  let columnNumber = 0;
  for (const column of IMPORT_COLUMNS) {
    if (!column.options) continue;
    const values = column.options === 'CLASSROOMS' ? classroomLabels : column.options;
    if (values.length === 0) continue;
    columnNumber += 1;
    sheet.getCell(1, columnNumber).value = column.header;
    values.forEach((value, index) => { sheet.getCell(index + 2, columnNumber).value = value; });
    const letter = numToCol(columnNumber);
    ranges.set(column.key, `Listas!$${letter}$2:$${letter}$${values.length + 1}`);
  }
  return ranges;
}

function addInstructionsSheet(workbook: ExcelJS.Workbook, input: TemplateInput): void {
  const sheet = workbook.addWorksheet('Instrucciones');
  sheet.getColumn(1).width = 110;
  const lines: Array<[string, 'title' | 'heading' | 'text']> = [
    [`Carga de alumnos ${input.year} — ${input.schoolName}`, 'title'],
    ['', 'text'],
    ['Cómo llenar la hoja "Alumnos"', 'heading'],
    ['1. Escribe un alumno por fila, a partir de la fila 3. No cambies ni borres los títulos de las columnas.', 'text'],
    ['2. Las columnas amarillas son obligatorias. Las grises son opcionales: llénalas si tienes el dato.', 'text'],
    ['3. En las columnas con lista (Sexo, Aula, Parentesco…) elige una opción de la lista desplegable.', 'text'],
    ['4. Fechas en formato día/mes/año. Ejemplo: 15/03/2015.', 'text'],
    ['5. El DNI lleva 8 dígitos, incluidos los ceros a la izquierda (ejemplo: 07654321).', 'text'],
    [`6. La fila de ejemplo (apellido que empieza con "${EXAMPLE_MARKER}") no se carga: puedes borrarla o dejarla.`, 'text'],
    ['', 'text'],
    ['Apoderados', 'heading'],
    ['• El apoderado principal es obligatorio: será el apoderado legal y el responsable de pago del alumno.', 'text'],
    ['• Ingresará a la plataforma con su número de documento, así que debe estar bien escrito.', 'text'],
    ['• Hermanos: repite los mismos datos del apoderado en la fila de cada hijo, con el mismo número de documento.', 'text'],
    ['• El segundo apoderado es opcional. Si lo llenas, se necesitan parentesco, apellido paterno, nombres y documento.', 'text'],
    ['', 'text'],
    ['Aulas', 'heading'],
    ['• La lista de aulas trae las secciones que el colegio tiene abiertas este año. Si falta alguna, avisa antes de llenar.', 'text'],
    ['', 'text'],
    ['Al terminar', 'heading'],
    ['• Guarda el archivo en formato Excel (.xlsx) y envíalo. No hace falta escribir contraseñas: se generan después.', 'text'],
    ['• Si alguna fila tiene un dato incorrecto, se te devolverá un Excel solo con esas filas y el motivo, para corregirlas.', 'text'],
  ];
  lines.forEach(([text, kind], index) => {
    const cell = sheet.getCell(index + 1, 1);
    cell.value = text;
    cell.alignment = { wrapText: true, vertical: 'top' };
    if (kind === 'title') cell.font = { bold: true, size: 14 };
    if (kind === 'heading') cell.font = { bold: true, size: 11, color: { argb: 'FF1D4ED8' } };
  });
}

export async function buildImportWorkbook(input: TemplateInput): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'KIPUX';
  const sheet = workbook.addWorksheet(DATA_SHEET_NAME, { views: [{ state: 'frozen', xSplit: 3, ySplit: HEADER_ROW }] });
  addInstructionsSheet(workbook, input);
  const listRanges = addListsSheet(workbook, input.classroomLabels);
  const validations = (sheet as unknown as { dataValidations: DataValidationsApi }).dataValidations;

  // Fila 1: franja del grupo. Fila 2: títulos de columna.
  let groupStart = 1;
  const seenGroups = new Set<ColumnGroup>();
  IMPORT_COLUMNS.forEach((column, index) => {
    const columnNumber = index + 1;
    const letter = numToCol(columnNumber);
    const sheetColumn = sheet.getColumn(columnNumber);
    sheetColumn.width = column.width;
    if (TEXT_COLUMNS.has(column.key)) sheetColumn.numFmt = '@';

    const header = sheet.getCell(HEADER_ROW, columnNumber);
    header.value = column.required ? `${column.header} *` : column.header;
    header.font = { bold: true, size: 10 };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: column.required ? REQUIRED_FILL : OPTIONAL_FILL } };
    header.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    header.border = BORDER;
    header.note = `${column.required ? 'OBLIGATORIO. ' : 'Opcional. '}${column.help}`;

    const next = IMPORT_COLUMNS[index + 1];
    if (!next || next.group !== column.group) {
      const band = sheet.getCell(1, groupStart);
      band.value = seenGroups.has(column.group) ? `${GROUP_LABEL[column.group]} — datos opcionales` : GROUP_LABEL[column.group];
      band.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      band.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GROUP_COLOR[column.group] } };
      band.alignment = { vertical: 'middle', horizontal: 'left' };
      if (columnNumber > groupStart) sheet.mergeCells(1, groupStart, 1, columnNumber);
      seenGroups.add(column.group);
      groupStart = columnNumber + 1;
    }

    const range = `${letter}${FIRST_DATA_ROW}:${letter}${LAST_VALIDATED_ROW}`;
    const listRange = listRanges.get(column.key);
    const prompt = { showInputMessage: true, promptTitle: column.header.slice(0, 32), prompt: column.help.slice(0, 250) };
    if (listRange) {
      validations.add(range, {
        type: 'list', allowBlank: true, formulae: [listRange], ...prompt,
        showErrorMessage: true, errorStyle: 'warning', errorTitle: 'Valor fuera de la lista', error: 'Elige una opción de la lista desplegable.',
      });
    } else {
      validations.add(range, { type: 'textLength', operator: 'greaterThanOrEqual', allowBlank: true, formulae: [0], showErrorMessage: false, ...prompt });
    }
  });
  sheet.getRow(1).height = 20;
  sheet.getRow(HEADER_ROW).height = 34;

  const writeRow = (rowNumber: number, values: Partial<Record<ColumnKey, string>>, italic: boolean): void => {
    IMPORT_COLUMNS.forEach((column, index) => {
      const value = values[column.key];
      if (!value) return;
      const cell = sheet.getCell(rowNumber, index + 1);
      cell.value = value;
      if (italic) cell.font = { italic: true, color: { argb: 'FF64748B' } };
    });
  };

  if (input.rejected) {
    const reasonColumn = IMPORT_COLUMNS.length + 1;
    sheet.getColumn(reasonColumn).width = 80;
    const reasonHeader = sheet.getCell(HEADER_ROW, reasonColumn);
    reasonHeader.value = REJECTION_HEADER;
    reasonHeader.font = { bold: true, size: 10, color: { argb: 'FFB91C1C' } };
    reasonHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    reasonHeader.alignment = { vertical: 'middle', horizontal: 'center' };
    reasonHeader.border = BORDER;
    input.rejected.forEach((entry, index) => {
      const rowNumber = FIRST_DATA_ROW + index;
      writeRow(rowNumber, entry.raw, false);
      const reason = sheet.getCell(rowNumber, reasonColumn);
      reason.value = entry.reason;
      reason.font = { color: { argb: 'FFB91C1C' } };
      reason.alignment = { wrapText: true, vertical: 'top' };
    });
  } else {
    const example: Partial<Record<ColumnKey, string>> = {};
    IMPORT_COLUMNS.forEach((column) => { example[column.key] = column.example; });
    example.classroom = input.classroomLabels[0] ?? '';
    writeRow(FIRST_DATA_ROW, example, true);
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export interface ReadResult {
  rows: Array<{ rowNumber: number; raw: RawRow }>;
  /** Columnas de la plantilla que el archivo no trae (solo opcionales; las obligatorias lanzan error). */
  missingOptionalColumns: string[];
}

const headerKey = (text: string): string => normalizeLabel(text);
const clean = (value: string | undefined): string => (value ?? '').replace(/\s+/g, ' ').trim();

/** Lee el Excel que devuelve el colegio. Lanza Error con un mensaje para el usuario si no sirve. */
export async function readImportWorkbook(buffer: Buffer): Promise<ReadResult> {
  const workbook = await XlsxWorkbook.open(buffer);
  const visible = workbook.sheets.filter((sheet) => sheet.state === 'visible');
  const candidates = [
    ...visible.filter((sheet) => headerKey(sheet.name) === headerKey(DATA_SHEET_NAME)),
    ...visible.filter((sheet) => headerKey(sheet.name) !== headerKey(DATA_SHEET_NAME)),
  ];

  const anchor = headerKey(IMPORT_COLUMNS.find((column) => column.key === 'documentId')!.header);
  for (const sheet of candidates) {
    const cells = await workbook.readCells(sheet);
    let headerRow = 0;
    let lastRow = 0;
    for (const [ref, value] of cells) {
      const { row } = splitRef(ref);
      lastRow = Math.max(lastRow, row);
      if (headerKey(value) === anchor && (headerRow === 0 || row < headerRow)) headerRow = row;
    }
    if (!headerRow) continue;

    const columnOf = new Map<ColumnKey, number>();
    const byHeader = new Map(IMPORT_COLUMNS.map((column) => [headerKey(column.header), column.key]));
    for (const [ref, value] of cells) {
      const { row, col } = splitRef(ref);
      if (row !== headerRow) continue;
      const key = byHeader.get(headerKey(value));
      if (key && !columnOf.has(key)) columnOf.set(key, col);
    }
    const missingRequired = IMPORT_COLUMNS.filter((column) => column.required && !columnOf.has(column.key));
    if (missingRequired.length) {
      throw new Error(`Al archivo le faltan columnas obligatorias: ${missingRequired.map((column) => column.header).join(', ')}. Usa la plantilla sin cambiar los títulos.`);
    }

    const rows: ReadResult['rows'] = [];
    for (let rowNumber = headerRow + 1; rowNumber <= lastRow; rowNumber += 1) {
      const raw = Object.fromEntries(COLUMN_KEYS.map((key) => {
        const column = columnOf.get(key);
        return [key, column ? clean(cells.get(cellRef(column, rowNumber))) : ''];
      })) as RawRow;
      if (COLUMN_KEYS.every((key) => !raw[key])) continue;
      if (raw.lastNamePaternal.toUpperCase().startsWith(EXAMPLE_MARKER)) continue;
      rows.push({ rowNumber, raw });
    }
    if (rows.length > MAX_IMPORT_ROWS) {
      throw new Error(`El archivo tiene ${rows.length} alumnos y el máximo por carga es ${MAX_IMPORT_ROWS}. Divídelo en dos archivos.`);
    }
    return {
      rows,
      missingOptionalColumns: IMPORT_COLUMNS.filter((column) => !column.required && !columnOf.has(column.key)).map((column) => column.header),
    };
  }
  throw new Error('El archivo no es la plantilla de carga de alumnos: no se encontró la columna "N.° de documento". Descarga la plantilla y llénala sin cambiar los títulos.');
}
