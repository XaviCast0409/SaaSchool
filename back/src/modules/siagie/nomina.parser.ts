import type { DocumentType, EducationLevel, EnrollmentState, Gender, Shift } from '@prisma/client';
import { XlsxWorkbook, findCell, normalizeLabel, splitRef, cellRef, type CellMap } from './xlsx-xml';

/** Reporte "Listado de estudiantes" (rptListadoEstudiantes.xlsx) exportado del SIAGIE. */

export interface NominaRow {
  item: number;
  rowNumber: number;
  gradeText: string;
  grade: number | null;
  section: string;
  documentType: DocumentType;
  documentTypeText: string;
  documentId: string;
  reniecValidated: boolean;
  studentCode: string | null;
  lastNamePaternal: string;
  lastNameMaternal: string | null;
  firstNames: string;
  gender: Gender | null;
  birthDate: Date | null;
  enrollmentState: EnrollmentState;
  enrollmentStateText: string;
  vacancyType: string | null;
  issues: string[]; // Bloquean la fila
  warnings: string[]; // Informativos
}

export interface NominaFile {
  fileName: string;
  modularCode: string | null;
  schoolName: string | null;
  levelText: string | null;
  level: EducationLevel | null;
  shift: Shift;
  shiftText: string | null;
  year: number | null;
  rows: NominaRow[];
  issues: string[];
}

const ORDINALS: Record<string, number> = {
  primero: 1, primer: 1, segundo: 2, tercero: 3, tercer: 3, cuarto: 4, quinto: 5, sexto: 6,
};

export function parseGradeText(text: string, level: EducationLevel | null): number | null {
  const n = normalizeLabel(text);
  const years = n.match(/(\d+)\s*anos?/);
  if (years) return Number(years[1]);
  const first = n.split(' ')[0];
  if (ORDINALS[first]) return ORDINALS[first];
  const digit = n.match(/^(\d+)/);
  if (digit) return Number(digit[1]);
  if (level === 'INITIAL') {
    const any = n.match(/(\d)/);
    if (any) return Number(any[1]);
  }
  return null;
}

export function parseLevel(text: string | null | undefined): EducationLevel | null {
  const n = normalizeLabel(text ?? '');
  if (n.includes('secundaria')) return 'SECONDARY';
  if (n.includes('primaria')) return 'PRIMARY';
  if (n.includes('inicial')) return 'INITIAL';
  return null;
}

export function parseShift(text: string | null | undefined): Shift {
  const n = normalizeLabel(text ?? '');
  if (n.includes('tarde')) return 'AFTERNOON';
  if (n.includes('noche')) return 'NIGHT';
  return 'MORNING';
}

export function parseDocumentType(text: string): DocumentType {
  const n = normalizeLabel(text);
  if (n === 'dni' || n.includes('documento nacional')) return 'DNI';
  if (n.includes('extranjer') || n === 'ce') return 'CE';
  if (n.includes('pasaporte')) return 'PASSPORT';
  if (n.includes('ptp') || n.includes('permiso temporal')) return 'PTP';
  if (n.includes('partida')) return 'PNA';
  if (n.includes('codigo') || n.includes('sin documento')) return 'CODIGO_TEMPORAL';
  return 'DNI';
}

export function parseEnrollmentState(text: string): EnrollmentState {
  const n = normalizeLabel(text);
  if (n.includes('traslad')) return 'TRANSFERRED';
  if (n.includes('retir')) return 'WITHDRAWN';
  return 'REGISTERED';
}

/** dd/mm/yyyy o número de serie de Excel. Devuelve fecha a medianoche UTC. */
export function parseDate(text: string | undefined): Date | null {
  if (!text) return null;
  const t = text.trim();
  const m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (m) {
    const d = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  if (/^\d+(\.\d+)?$/.test(t)) {
    const serial = Number(t);
    if (serial > 20000 && serial < 80000) return new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000);
  }
  return null;
}

const clean = (v: string | undefined) => (v ?? '').replace(/\s+/g, ' ').trim();

/** Valor de la celda debajo de una etiqueta (ej: "NIVEL" en fila 7 → valor en fila 8). */
function valueBelow(cells: CellMap, test: (n: string) => boolean): string | null {
  const label = findCell(cells, test);
  if (!label) return null;
  for (let r = label.row + 1; r <= label.row + 2; r += 1) {
    const v = clean(cells.get(cellRef(label.col, r)));
    if (v) return v;
  }
  return null;
}

const COLUMN_LABELS: Array<[keyof Columns, (n: string) => boolean]> = [
  ['item', (n) => n === 'item'],
  ['grade', (n) => n === 'grado'],
  ['section', (n) => n === 'seccion'],
  ['docType', (n) => n === 'tipo de documento'],
  ['docNumber', (n) => n === 'numero de documento'],
  ['reniec', (n) => n.startsWith('validado con reniec')],
  ['code', (n) => n.startsWith('codigo del estudiante') || n === 'codigo de estudiante'],
  ['paternal', (n) => n === 'apellido paterno'],
  ['maternal', (n) => n === 'apellido materno'],
  ['names', (n) => n === 'nombres'],
  ['gender', (n) => n === 'sexo'],
  ['birthDate', (n) => n.startsWith('fecha de nacimiento')],
  ['state', (n) => n.startsWith('estado de matricula')],
  ['vacancy', (n) => n.startsWith('tipo de vacante')],
];

interface Columns {
  item: number; grade: number; section: number; docType: number; docNumber: number; reniec: number; code: number;
  paternal: number; maternal: number; names: number; gender: number; birthDate: number; state: number; vacancy: number;
}

export async function parseNomina(buffer: Buffer, fileName: string): Promise<NominaFile> {
  const wb = await XlsxWorkbook.open(buffer);
  const sheet = wb.sheets.find((s) => s.state === 'visible') ?? wb.sheets[0];
  if (!sheet) throw new Error('El archivo no tiene hojas.');
  const cells = await wb.readCells(sheet);

  const itemHeader = findCell(cells, (n) => n === 'item');
  if (!itemHeader) {
    throw new Error(`"${fileName}" no parece un listado de estudiantes del SIAGIE (no se encontró la columna ITEM).`);
  }

  // Las etiquetas están en la fila de ITEM y en la siguiente (subcabecera de ESTUDIANTE).
  const cols: Partial<Columns> = {};
  for (const [ref, value] of cells) {
    const { row, col } = splitRef(ref);
    if (row !== itemHeader.row && row !== itemHeader.row + 1) continue;
    const n = normalizeLabel(value);
    for (const [key, test] of COLUMN_LABELS) {
      if (test(n) && (cols[key] === undefined || col < cols[key]!)) cols[key] = col;
    }
  }
  const missing = (['grade', 'section', 'docNumber', 'paternal', 'names'] as const).filter((k) => cols[k] === undefined);
  if (missing.length) throw new Error(`"${fileName}": faltan columnas obligatorias en el listado (${missing.join(', ')}).`);

  const levelText = valueBelow(cells, (n) => n === 'nivel');
  const level = parseLevel(levelText);
  const shiftText = valueBelow(cells, (n) => n === 'turno');
  const titleCell = findCell(cells, (n) => n.startsWith('total de estudiantes'));
  const yearMatch = titleCell ? cells.get(titleCell.ref)?.match(/(20\d{2})/) : null;

  const file: NominaFile = {
    fileName,
    modularCode: valueBelow(cells, (n) => n === 'codigo modular'),
    schoolName: valueBelow(cells, (n) => n === 'institucion educativa'),
    levelText,
    level,
    shift: parseShift(shiftText),
    shiftText,
    year: yearMatch ? Number(yearMatch[1]) : null,
    rows: [],
    issues: [],
  };
  if (!level) file.issues.push('No se pudo identificar el nivel educativo del listado.');

  const get = (key: keyof Columns, row: number) => (cols[key] === undefined ? '' : clean(cells.get(cellRef(cols[key]!, row))));
  let lastRow = 0;
  for (const ref of cells.keys()) lastRow = Math.max(lastRow, splitRef(ref).row);

  for (let r = itemHeader.row + 1; r <= lastRow; r += 1) {
    const item = get('item', r);
    if (!/^\d+$/.test(item)) continue;
    const issues: string[] = [];
    const warnings: string[] = [];
    const gradeText = get('grade', r);
    const grade = parseGradeText(gradeText, level);
    if (grade === null) issues.push(`Grado no reconocido: "${gradeText}".`);
    const documentTypeText = get('docType', r) || 'DNI';
    const documentId = get('docNumber', r).replace(/\s/g, '');
    const rawCode = get('code', r).replace(/\D/g, '');
    const studentCode = /^\d{14}$/.test(rawCode) ? rawCode : null;
    if (!studentCode) warnings.push('Sin código de estudiante SIAGIE válido (14 dígitos).');
    const genderText = normalizeLabel(get('gender', r));
    const gender: Gender | null = genderText.startsWith('hom') || genderText === 'm' || genderText.startsWith('masc')
      ? 'MALE'
      : genderText.startsWith('muj') || genderText === 'f' || genderText.startsWith('fem') ? 'FEMALE' : null;
    if (!gender) issues.push('Sexo no reconocido.');
    const birthDate = parseDate(get('birthDate', r));
    if (!birthDate) issues.push('Fecha de nacimiento no válida.');
    const firstNames = get('names', r);
    const lastNamePaternal = get('paternal', r);
    if (!firstNames || !lastNamePaternal) issues.push('Faltan nombres o apellido paterno.');
    // Sin número de documento (no validado con RENIEC): se identifica con el código del estudiante.
    let documentType = parseDocumentType(documentTypeText);
    let finalDocumentId = documentId;
    if (!documentId) {
      if (studentCode) {
        documentType = 'CODIGO_TEMPORAL';
        finalDocumentId = studentCode;
        warnings.push('Sin número de documento en el SIAGIE: se registra con su código de estudiante.');
      } else {
        issues.push('Falta el número de documento.');
      }
    }
    const stateText = get('state', r) || 'DEFINITIVA';

    file.rows.push({
      item: Number(item),
      rowNumber: r,
      gradeText,
      grade,
      section: get('section', r).toUpperCase() || 'A',
      documentType,
      documentTypeText,
      documentId: finalDocumentId,
      warnings,
      reniecValidated: normalizeLabel(get('reniec', r)).startsWith('validado'),
      studentCode,
      lastNamePaternal,
      lastNameMaternal: get('maternal', r) || null,
      firstNames,
      gender,
      birthDate,
      enrollmentState: parseEnrollmentState(stateText),
      enrollmentStateText: stateText,
      vacancyType: get('vacancy', r) || null,
      issues,
    });
  }
  if (file.rows.length === 0) file.issues.push('El listado no tiene estudiantes.');
  return file;
}
