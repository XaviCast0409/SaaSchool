import JSZip from 'jszip';

/**
 * Lector/escritor mínimo de .xlsx trabajando directamente sobre el XML del archivo.
 *
 * Por qué no ExcelJS/SheetJS: las plantillas del SIAGIE llegan protegidas, con listas desplegables,
 * una hoja oculta de parámetros y a veces con XML con prefijo de espacio de nombres (`<x:worksheet>`),
 * que ExcelJS no abre. Al re-serializar con esas librerías se pierden partes de la plantilla y el SIAGIE
 * puede rechazarla. Aquí solo se tocan las celdas que se llenan; todo lo demás queda byte a byte igual.
 */

export interface SheetInfo {
  name: string;
  state: 'visible' | 'hidden' | 'veryHidden';
  path: string; // ruta dentro del zip, ej: xl/worksheets/sheet3.xml
}

export type CellMap = Map<string, string>;

const XML_INVALID = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

export function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');
}

export function encodeXml(s: string): string {
  return s.replace(XML_INVALID, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`\\s${escapeRe(name)}="([^"]*)"`));
  return m ? decodeXml(m[1]) : undefined;
}

export function colToNum(col: string): number {
  let n = 0;
  for (const ch of col.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

export function numToCol(n: number): string {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function splitRef(ref: string): { col: number; row: number } {
  const m = ref.match(/^([A-Z]+)(\d+)$/i);
  if (!m) throw new Error(`Referencia de celda inválida: ${ref}`);
  return { col: colToNum(m[1]), row: Number(m[2]) };
}

export const cellRef = (col: number, row: number) => `${numToCol(col)}${row}`;

/** Prefijo de espacio de nombres usado por el elemento raíz (ej: "x:" o ""). */
function rootPrefix(xml: string, rootName: string): string {
  const m = xml.match(new RegExp(`<([A-Za-z][\\w.-]*:)?${rootName}[\\s>]`));
  return m?.[1] ?? '';
}

function textOf(fragment: string, p: string): string {
  const cleaned = fragment.replace(new RegExp(`<${escapeRe(p)}rPh\\b[\\s\\S]*?</${escapeRe(p)}rPh>`, 'g'), '');
  const re = new RegExp(`<${escapeRe(p)}t(?:\\s[^>]*)?(?:/>|>([\\s\\S]*?)</${escapeRe(p)}t>)`, 'g');
  let out = '';
  for (const m of cleaned.matchAll(re)) out += decodeXml(m[1] ?? '');
  return out;
}

function resolvePath(base: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1);
  const parts = base.split('/');
  parts.pop();
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

export class XlsxWorkbook {
  private sharedStrings: string[] = [];
  private sstIndex = new Map<string, number>();
  private sstPath: string | null = null;
  private sstXml = '';
  private sstPrefix = '';
  private newStrings: string[] = [];
  private addedRefs = 0;
  private sheetXml = new Map<string, string>();
  private dirty = new Set<string>();

  private constructor(private zip: JSZip, public readonly sheets: SheetInfo[]) {}

  static async open(buffer: Buffer | ArrayBuffer | Uint8Array): Promise<XlsxWorkbook> {
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(buffer);
    } catch {
      throw new Error('El archivo no es un Excel .xlsx válido.');
    }
    const wbXml = await zip.file('xl/workbook.xml')?.async('string');
    const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
    if (!wbXml || !relsXml) throw new Error('El archivo no es un Excel .xlsx válido.');

    const rp = rootPrefix(relsXml, 'Relationships');
    const rels = new Map<string, { target: string; type: string }>();
    for (const m of relsXml.matchAll(new RegExp(`<${escapeRe(rp)}Relationship\\b[^>]*>`, 'g'))) {
      const id = attr(m[0], 'Id');
      const target = attr(m[0], 'Target');
      if (id && target) rels.set(id, { target, type: attr(m[0], 'Type') ?? '' });
    }

    const wp = rootPrefix(wbXml, 'workbook');
    const sheets: SheetInfo[] = [];
    for (const m of wbXml.matchAll(new RegExp(`<${escapeRe(wp)}sheet\\b[^>]*>`, 'g'))) {
      const name = attr(m[0], 'name') ?? '';
      const rid = attr(m[0], 'r:id') ?? (m[0].match(/\s[\w]+:id="([^"]*)"/)?.[1] ?? '');
      const rel = rels.get(rid);
      if (!rel) continue;
      const state = (attr(m[0], 'state') ?? 'visible') as SheetInfo['state'];
      sheets.push({ name, state, path: resolvePath('xl/workbook.xml', rel.target) });
    }

    const wb = new XlsxWorkbook(zip, sheets);
    const sstRel = [...rels.values()].find((r) => r.type.endsWith('/sharedStrings'));
    if (sstRel) {
      const path = resolvePath('xl/workbook.xml', sstRel.target);
      const xml = await zip.file(path)?.async('string');
      if (xml) {
        wb.sstPath = path;
        wb.sstXml = xml;
        wb.sstPrefix = rootPrefix(xml, 'sst');
        const p = escapeRe(wb.sstPrefix);
        for (const m of xml.matchAll(new RegExp(`<${p}si\\b[^>]*?(?:/>|>([\\s\\S]*?)</${p}si>)`, 'g'))) {
          wb.sharedStrings.push(textOf(m[1] ?? '', wb.sstPrefix));
        }
        wb.sharedStrings.forEach((s, i) => { if (!wb.sstIndex.has(s)) wb.sstIndex.set(s, i); });
      }
    }
    return wb;
  }

  getSheet(name: string): SheetInfo | undefined {
    return this.sheets.find((s) => s.name === name);
  }

  private async xmlOf(sheet: SheetInfo): Promise<string> {
    const cached = this.sheetXml.get(sheet.path);
    if (cached !== undefined) return cached;
    const xml = await this.zip.file(sheet.path)?.async('string');
    if (xml === undefined) throw new Error(`No se encontró la hoja "${sheet.name}" dentro del archivo.`);
    this.sheetXml.set(sheet.path, xml);
    return xml;
  }

  /** Lee todas las celdas con valor de una hoja (texto ya resuelto). Celdas vacías no aparecen. */
  async readCells(sheet: SheetInfo): Promise<CellMap> {
    const xml = await this.xmlOf(sheet);
    const p = escapeRe(rootPrefix(xml, 'worksheet'));
    const prefix = rootPrefix(xml, 'worksheet');
    const cells: CellMap = new Map();
    const re = new RegExp(`<${p}c\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${p}c>)`, 'g');
    for (const m of xml.matchAll(re)) {
      const head = m[1];
      const body = m[2];
      if (!body) continue;
      const ref = attr(head, 'r');
      if (!ref) continue;
      const t = attr(head, 't');
      let value: string;
      if (t === 'inlineStr') {
        value = textOf(body, prefix);
      } else {
        const v = body.match(new RegExp(`<${p}v(?:\\s[^>]*)?>([\\s\\S]*?)</${p}v>`));
        if (!v) continue;
        const raw = decodeXml(v[1]);
        value = t === 's' ? (this.sharedStrings[Number(raw)] ?? '') : raw;
      }
      if (value !== '') cells.set(ref.toUpperCase(), value);
    }
    return cells;
  }

  private stringIndex(text: string): number {
    const hit = this.sstIndex.get(text);
    if (hit !== undefined) return hit;
    const idx = this.sharedStrings.length;
    this.sharedStrings.push(text);
    this.sstIndex.set(text, idx);
    this.newStrings.push(text);
    return idx;
  }

  /**
   * Escribe textos en celdas de una hoja conservando el estilo (atributo s) de cada celda.
   * Usa la tabla de cadenas compartidas, igual que Excel, WPS y Cubicol.
   */
  async setCells(sheet: SheetInfo, values: Array<{ ref: string; text: string }>): Promise<void> {
    if (values.length === 0) return;
    let xml = await this.xmlOf(sheet);
    const prefix = rootPrefix(xml, 'worksheet');
    const p = escapeRe(prefix);
    for (const { ref, text } of values) {
      const clean = text.replace(XML_INVALID, '');
      const { row, col } = splitRef(ref.toUpperCase());
      const cellBody = (style: string | undefined) => {
        const s = style !== undefined ? ` s="${style}"` : '';
        if (this.sstPath) {
          this.addedRefs += 1;
          return `<${prefix}c r="${ref.toUpperCase()}"${s} t="s"><${prefix}v>${this.stringIndex(clean)}</${prefix}v></${prefix}c>`;
        }
        return `<${prefix}c r="${ref.toUpperCase()}"${s} t="inlineStr"><${prefix}is><${prefix}t xml:space="preserve">${encodeXml(clean)}</${prefix}t></${prefix}is></${prefix}c>`;
      };

      const rowRe = new RegExp(`<${p}row\\b([^>]*?)(/>|>([\\s\\S]*?)</${p}row>)`, 'g');
      let rowMatch: RegExpMatchArray | null = null;
      let insertRowAt = -1;
      for (const m of xml.matchAll(rowRe)) {
        const r = Number(attr(m[1], 'r'));
        if (r === row) { rowMatch = m; break; }
        if (r > row && insertRowAt < 0) insertRowAt = m.index!;
      }

      if (!rowMatch) {
        const newRow = `<${prefix}row r="${row}">${cellBody(undefined)}</${prefix}row>`;
        if (insertRowAt >= 0) {
          xml = xml.slice(0, insertRowAt) + newRow + xml.slice(insertRowAt);
        } else {
          const close = xml.search(new RegExp(`</${p}sheetData>`));
          if (close >= 0) xml = xml.slice(0, close) + newRow + xml.slice(close);
          else xml = xml.replace(new RegExp(`<${p}sheetData\\s*/>`), `<${prefix}sheetData>${newRow}</${prefix}sheetData>`);
        }
        continue;
      }

      const rowStart = rowMatch.index!;
      const rowFull = rowMatch[0];
      const rowHead = rowMatch[1];
      const inner = rowMatch[3] ?? '';
      const cellRe = new RegExp(`<${p}c\\b([^>]*?)(?:/>|>[\\s\\S]*?</${p}c>)`, 'g');
      let newInner: string | null = null;
      let insertAt = -1;
      for (const m of inner.matchAll(cellRe)) {
        const r = attr(m[1], 'r');
        if (!r) continue;
        const c = splitRef(r.toUpperCase()).col;
        if (c === col) {
          newInner = inner.slice(0, m.index!) + cellBody(attr(m[1], 's')) + inner.slice(m.index! + m[0].length);
          break;
        }
        if (c > col && insertAt < 0) insertAt = m.index!;
      }
      if (newInner === null) {
        newInner = insertAt >= 0 ? inner.slice(0, insertAt) + cellBody(undefined) + inner.slice(insertAt) : inner + cellBody(undefined);
      }
      const rebuilt = `<${prefix}row${rowHead}>${newInner}</${prefix}row>`;
      xml = xml.slice(0, rowStart) + rebuilt + xml.slice(rowStart + rowFull.length);
    }
    this.sheetXml.set(sheet.path, xml);
    this.dirty.add(sheet.path);
  }

  async toBuffer(): Promise<Buffer> {
    for (const path of this.dirty) this.zip.file(path, this.sheetXml.get(path)!);
    if (this.sstPath && this.newStrings.length > 0) {
      const p = this.sstPrefix;
      const added = this.newStrings
        .map((s) => `<${p}si><${p}t xml:space="preserve">${encodeXml(s)}</${p}t></${p}si>`)
        .join('');
      let xml = this.sstXml;
      const close = xml.lastIndexOf(`</${p}sst>`);
      if (close >= 0) {
        xml = xml.slice(0, close) + added + xml.slice(close);
      } else {
        xml = xml.replace(new RegExp(`<${escapeRe(p)}sst\\b([^>]*)/>`), `<${p}sst$1>${added}</${p}sst>`);
      }
      xml = xml.replace(new RegExp(`(<${escapeRe(p)}sst\\b[^>]*?)\\suniqueCount="\\d+"`), `$1 uniqueCount="${this.sharedStrings.length}"`);
      xml = xml.replace(new RegExp(`(<${escapeRe(p)}sst\\b[^>]*?)\\scount="(\\d+)"`), (_, a, n) => `${a} count="${Number(n) + this.addedRefs}"`);
      this.zip.file(this.sstPath, xml);
    }
    return this.zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  }
}

/** Busca la primera celda cuyo texto normalizado cumpla la condición. */
export function findCell(cells: CellMap, test: (normalized: string) => boolean): { ref: string; col: number; row: number } | null {
  let best: { ref: string; col: number; row: number } | null = null;
  for (const [ref, value] of cells) {
    if (!test(normalizeLabel(value))) continue;
    const { col, row } = splitRef(ref);
    if (!best || row < best.row || (row === best.row && col < best.col)) best = { ref, col, row };
  }
  return best;
}

export function normalizeLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
