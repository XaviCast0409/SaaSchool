import type { EducationLevel } from '@prisma/client';
import { CNEB_AREAS, matchCnebNumberByName } from '../academic/cneb.catalog';
import { parseGradeText, parseLevel } from './nomina.parser';
import { XlsxWorkbook, cellRef, colToNum, normalizeLabel, numToCol, splitRef, type CellMap, type SheetInfo } from './xlsx-xml';

/**
 * Plantilla "Registro de notas" del SIAGIE (RegNotas_<codmod>_<diseño>_<nivel><año>_<periodo>_<n>.xlsx).
 *
 * Estructura (2026):
 * - Hoja oculta "Parametros": nivel, año, periodo, grado y sección (código + nombre).
 * - Una hoja por área: "063-MATE", "017-COMU", "0006-DESEN TIC"… Fila 1: ID | Cód. Estudiante | Nombres |
 *   01 | | 02 | …  Fila 2: NL | Conclusión descriptiva…  Desde la fila 3, un estudiante por fila.
 *   Debajo, la LEYENDA "01 = Se comunica oralmente…" que dice qué competencia es cada columna.
 */

export interface TemplateCompetenceColumn {
  label: string; // "01"
  nlCol: number;
  conclusionCol: number | null;
  name: string; // texto de la leyenda
  cnebNumber: number | null;
}

export interface TemplateStudentRow {
  row: number;
  siagieId: string;
  studentCode: string;
  fullName: string;
}

export interface TemplateAreaSheet {
  sheet: SheetInfo;
  siagieCode: string; // "063"
  siagieName: string; // "MATE"
  fullName: string; // "MATEMÁTICA" (de Generalidades si está)
  areaCode: string | null; // código interno CNEB (MAT, COM, TRANS…)
  competences: TemplateCompetenceColumn[];
  students: TemplateStudentRow[];
  cells: CellMap;
}

export interface ParsedTemplate {
  fileName: string;
  workbook: XlsxWorkbook;
  modularCode: string | null;
  level: EducationLevel | null;
  levelText: string;
  year: number | null;
  periodCode: string;
  periodText: string;
  periodNumber: number | null;
  grade: number | null;
  gradeText: string;
  section: string;
  areas: TemplateAreaSheet[];
  warnings: string[];
}

/** Abreviaturas de hoja del SIAGIE → área CNEB (y competencia fija para las transversales). */
const SHEET_AREAS: Array<{ test: (n: string) => boolean; area: string; only?: number[] }> = [
  { test: (n) => n === 'art y cult' || n.startsWith('arte'), area: 'ART' },
  { test: (n) => n.startsWith('cast segnl') || n.includes('segunda lengua'), area: 'C2L' },
  { test: (n) => n.startsWith('ingl'), area: 'ING' },
  { test: (n) => n.startsWith('cienc tec') || n.startsWith('ciencia y tecnologia'), area: 'CYT' },
  { test: (n) => n === 'comu' || n.startsWith('comunicacion'), area: 'COM' },
  { test: (n) => n === 'efis' || n.startsWith('educacion fisica'), area: 'EF' },
  { test: (n) => n === 'erel' || n.startsWith('educacion religiosa'), area: 'REL' },
  { test: (n) => n === 'mate' || n.startsWith('matematica'), area: 'MAT' },
  { test: (n) => n === 'ppss' || n.startsWith('personal social'), area: 'PS' },
  { test: (n) => n === 'psico' || n.startsWith('psicomotri'), area: 'PSI' },
  { test: (n) => n.startsWith('desarr pcc') || n.startsWith('desarrollo personal'), area: 'DPCC' },
  { test: (n) => n === 'ccss' || n.startsWith('ciencias sociales'), area: 'CCSS' },
  { test: (n) => n === 'etra' || n.startsWith('educacion para el trabajo'), area: 'EPT' },
  { test: (n) => n.startsWith('desen tic') || n.includes('entornos virtuales'), area: 'TRANS', only: [28] },
  { test: (n) => n.startsWith('gest auto') || n.includes('gestiona su aprendizaje'), area: 'TRANS', only: [29] },
];

export function resolveSheetArea(abbr: string, fullName: string): { area: string; only?: number[] } | null {
  for (const candidate of [normalizeLabel(abbr), normalizeLabel(fullName)]) {
    if (!candidate) continue;
    const hit = SHEET_AREAS.find((s) => s.test(candidate));
    if (hit) return { area: hit.area, only: hit.only };
  }
  return null;
}

/** Asigna a cada columna de la plantilla su competencia CNEB, usando la leyenda y el área. */
export function resolveCompetences(level: EducationLevel | null, areaCode: string | null, only: number[] | undefined, legend: string[]): Array<number | null> {
  const allowed = only ?? (level && areaCode ? CNEB_AREAS[level].find((a) => a.code === areaCode)?.competences ?? [] : []);
  const used = new Set<number>();
  const out: Array<number | null> = legend.map(() => null);
  const kindOf = (n: string) => (n.includes('oralmente') ? 'oral' : n.startsWith('lee ') || n.includes(' lee ') ? 'lee' : n.startsWith('escribe') ? 'escribe' : null);
  const BY_KIND: Record<string, number[]> = { oral: [7, 10, 13], lee: [8, 11, 14], escribe: [9, 12, 15] };

  legend.forEach((name, i) => {
    const direct = matchCnebNumberByName(name);
    if (direct !== null && allowed.includes(direct) && !used.has(direct)) { out[i] = direct; used.add(direct); return; }
    const kind = kindOf(normalizeLabel(name));
    if (kind) {
      const hit = BY_KIND[kind].find((n) => allowed.includes(n) && !used.has(n));
      if (hit !== undefined) { out[i] = hit; used.add(hit); }
    }
  });
  // Lo que no se pudo reconocer por nombre se asigna por posición con el orden oficial.
  legend.forEach((_, i) => {
    if (out[i] !== null) return;
    const next = allowed.find((n) => !used.has(n));
    if (next !== undefined && legend.length <= allowed.length) { out[i] = next; used.add(next); }
  });
  return out;
}

const clean = (v: string | undefined) => (v ?? '').replace(/\s+/g, ' ').trim();

function paramValue(cells: CellMap, label: (n: string) => boolean): { code: string; name: string } | null {
  for (const [ref, value] of cells) {
    const { col, row } = splitRef(ref);
    if (col !== 1 || !label(normalizeLabel(value))) continue;
    return { code: clean(cells.get(cellRef(2, row))), name: clean(cells.get(cellRef(3, row))) };
  }
  return null;
}

export async function parseRegNotas(buffer: Buffer, fileName: string): Promise<ParsedTemplate> {
  const wb = await XlsxWorkbook.open(buffer);
  const params = wb.sheets.find((s) => normalizeLabel(s.name) === 'parametros');
  if (!params) {
    throw new Error(`"${fileName}" no parece un registro de notas del SIAGIE (falta la hoja de parámetros). Descárgalo de nuevo del SIAGIE.`);
  }
  const p = await wb.readCells(params);
  const nivel = paramValue(p, (n) => n.startsWith('nivel'));
  const periodo = paramValue(p, (n) => n.startsWith('periodo') && !n.includes('promocional'));
  const grado = paramValue(p, (n) => n.startsWith('grado'));
  const seccion = paramValue(p, (n) => n.startsWith('seccion'));
  const anio = paramValue(p, (n) => n.startsWith('ano academico'));
  const codmod = paramValue(p, (n) => n.startsWith('codigo modular'));
  const level = parseLevel(nivel?.name ?? '');
  const periodCode = (periodo?.code ?? '').toUpperCase();
  const periodDigit = periodCode.match(/(\d)/);

  const warnings: string[] = [];
  const general = wb.sheets.find((s) => normalizeLabel(s.name) === 'generalidades');
  const fullNames = new Map<string, string>();
  if (general) {
    const g = await wb.readCells(general);
    for (const [ref, value] of g) {
      const m = value.match(/^\s*(\d+)\s*:\s*(.+)$/);
      if (!m) continue;
      const { row, col } = splitRef(ref);
      fullNames.set(m[1], clean(g.get(cellRef(col + 1, row))) || m[2]);
    }
  }

  const areas: TemplateAreaSheet[] = [];
  for (const sheet of wb.sheets) {
    const m = sheet.name.match(/^\s*(\d+)\s*-\s*(.+)$/);
    if (!m || sheet.state !== 'visible') continue;
    const cells = await wb.readCells(sheet);
    const fullName = fullNames.get(m[1]) ?? m[2];
    const resolved = resolveSheetArea(m[2], fullName);

    // Columnas de competencias: fila 2 con "NL"; su conclusión es la columna siguiente.
    const comps: TemplateCompetenceColumn[] = [];
    for (const [ref, value] of cells) {
      const { col, row } = splitRef(ref);
      if (row !== 2 || normalizeLabel(value) !== 'nl') continue;
      const next = normalizeLabel(cells.get(cellRef(col + 1, 2)) ?? '');
      comps.push({
        label: clean(cells.get(cellRef(col, 1))) || String(comps.length + 1).padStart(2, '0'),
        nlCol: col,
        conclusionCol: next.startsWith('conclusion') ? col + 1 : null,
        name: '',
        cnebNumber: null,
      });
    }
    comps.sort((a, b) => a.nlCol - b.nlCol);

    // Estudiantes y leyenda
    const students: TemplateStudentRow[] = [];
    const legend = new Map<string, string>();
    let lastRow = 0;
    for (const ref of cells.keys()) lastRow = Math.max(lastRow, splitRef(ref).row);
    for (let r = 3; r <= lastRow; r += 1) {
      const id = clean(cells.get(cellRef(1, r)));
      const code = clean(cells.get(cellRef(2, r))).replace(/\D/g, '');
      if (/^\d+$/.test(id) && code.length >= 8) {
        students.push({ row: r, siagieId: id, studentCode: code.padStart(14, '0'), fullName: clean(cells.get(cellRef(3, r))) });
        continue;
      }
      const leg = clean(cells.get(cellRef(2, r))).match(/^(\d{1,2})\s*=\s*(.+)$/);
      if (leg && normalizeLabel(leg[1]) !== 'nl') legend.set(leg[1].padStart(2, '0'), leg[2]);
    }
    comps.forEach((c) => { c.name = legend.get(c.label.padStart(2, '0')) ?? ''; });
    const numbers = resolveCompetences(level, resolved?.area ?? null, resolved?.only, comps.map((c) => c.name));
    comps.forEach((c, i) => { c.cnebNumber = numbers[i]; });

    if (!resolved) warnings.push(`No se reconoce el área de la hoja «${sheet.name}»: se dejará como está.`);
    else if (comps.some((c) => c.cnebNumber === null)) warnings.push(`En «${sheet.name}» hay competencias que no se pudieron identificar.`);

    areas.push({
      sheet, siagieCode: m[1], siagieName: m[2].trim(), fullName, areaCode: resolved?.area ?? null,
      competences: comps, students, cells,
    });
  }
  if (areas.length === 0) warnings.push('La plantilla no tiene hojas de áreas.');

  return {
    fileName,
    workbook: wb,
    modularCode: codmod?.code ?? null,
    level,
    levelText: nivel?.name ?? '',
    year: anio?.code && /^\d{4}$/.test(anio.code) ? Number(anio.code) : null,
    periodCode,
    periodText: periodo?.name ?? periodCode,
    periodNumber: periodDigit ? Number(periodDigit[1]) : null,
    grade: grado ? parseGradeText(grado.name || grado.code, level) : null,
    gradeText: grado?.name ?? '',
    section: (seccion?.name || seccion?.code || '').toUpperCase(),
    areas,
    warnings,
  };
}

export const colName = numToCol;
export const colNumber = colToNum;
