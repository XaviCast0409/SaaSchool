import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { XlsxWorkbook, colToNum, numToCol, splitRef } from '../xlsx-xml';
import { parseRegNotas, resolveCompetences, resolveSheetArea } from '../regnotas.parser';

/** Arma un .xlsx mínimo con o sin prefijo de espacio de nombres (las plantillas del SIAGIE traen ambos). */
async function buildXlsx(sheets: Array<{ name: string; state?: string; rows: string[][] }>, prefix = ''): Promise<Buffer> {
  const p = prefix ? `${prefix}:` : '';
  const ns = prefix ? `xmlns:${prefix}` : 'xmlns';
  const strings: string[] = [];
  const idx = (s: string) => { let i = strings.indexOf(s); if (i < 0) { strings.push(s); i = strings.length - 1; } return i; };
  const zip = new JSZip();
  sheets.forEach((sh, n) => {
    const rows = sh.rows.map((cells, r) => {
      const cs = cells.map((v, c) => {
        const ref = `${numToCol(c + 1)}${r + 1}`;
        if (v === '') return `<${p}c r="${ref}" s="6"/>`;
        if (/^\d+$/.test(v) && v.length < 10) return `<${p}c r="${ref}" s="4"><${p}v>${v}</${p}v></${p}c>`;
        return `<${p}c r="${ref}" s="2" t="s"><${p}v>${idx(v)}</${p}v></${p}c>`;
      }).join('');
      return `<${p}row r="${r + 1}">${cs}</${p}row>`;
    }).join('');
    zip.file(`xl/worksheets/sheet${n + 1}.xml`, `<?xml version="1.0" encoding="UTF-8"?><${p}worksheet ${ns}="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><${p}sheetData>${rows}</${p}sheetData><${p}dataValidations count="1"><${p}dataValidation type="list" sqref="D3"><${p}formula1>"A,AD,B,C"</${p}formula1></${p}dataValidation></${p}dataValidations></${p}worksheet>`);
  });
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8"?><${p}workbook ${ns}="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><${p}sheets>${sheets.map((sh, n) => `<${p}sheet name="${sh.name}" sheetId="${n + 1}"${sh.state ? ` state="${sh.state}"` : ''} r:id="rId${n + 1}"/>`).join('')}</${p}sheets></${p}workbook>`);
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, n) => `<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${n + 1}.xml"/>`).join('')}<Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`);
  zip.file('xl/sharedStrings.xml', `<?xml version="1.0" encoding="UTF-8"?><${p}sst ${ns}="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">${strings.map((s) => `<${p}si><${p}t>${s.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</${p}t></${p}si>`).join('')}</${p}sst>`);
  return zip.generateAsync({ type: 'nodebuffer' });
}

const TEMPLATE = (prefix = '') => buildXlsx([
  { name: 'Generalidades', rows: [['DATOS'], ['063: MATE', 'MATEMÁTICA']] },
  {
    name: 'Parametros', state: 'hidden', rows: [
      ['Código Modular:', '1055169', 'COLEGIO'], ['Nivel:', 'B0', 'Primaria'], ['Año Académico :', '2026'],
      ['Periodo :', 'B1', 'PRIMER BIMESTRE'], ['Grado :', '03', 'TERCERO'], ['Sección :', '01', 'A'],
    ],
  },
  {
    name: '063-MATE', rows: [
      ['ID', 'Cód. Estudiante', 'Nombres', '01', '', '02', ''],
      ['', '', '', 'NL', 'Conclusión descriptiva de la competencia', 'NL', 'Conclusión descriptiva de la competencia'],
      ['30107017', '23149880700070', 'ALIAGA LINARES, ROSALIA', '', '', '', ''],
      ['30107018', '23149880700071', 'BURGA LORETO, AIXA', 'A', ' ', '', ''],
      [], [],
      ['', 'LEYENDA'], ['', 'NL = Nivel de logro alcanzado'],
      ['', '01 = Resuelve problemas de cantidad'], ['', '02 = Resuelve problemas de forma, movimiento y localización'],
    ],
  },
], prefix);

describe('xlsx-xml', () => {
  it('convierte columnas y referencias', () => {
    expect(colToNum('A')).toBe(1);
    expect(colToNum('AB')).toBe(28);
    expect(numToCol(28)).toBe('AB');
    expect(splitRef('AA12')).toEqual({ col: 27, row: 12 });
  });

  for (const prefix of ['', 'x']) {
    it(`lee y escribe celdas conservando estilos y validaciones (prefijo "${prefix}")`, async () => {
      const wb = await XlsxWorkbook.open(await TEMPLATE(prefix));
      expect(wb.sheets.map((s) => s.name)).toEqual(['Generalidades', 'Parametros', '063-MATE']);
      expect(wb.getSheet('Parametros')?.state).toBe('hidden');
      const sheet = wb.getSheet('063-MATE')!;
      const cells = await wb.readCells(sheet);
      expect(cells.get('C3')).toBe('ALIAGA LINARES, ROSALIA');
      expect(cells.get('D3')).toBeUndefined();

      await wb.setCells(sheet, [
        { ref: 'D3', text: 'AD' }, // celda vacía existente
        { ref: 'E3', text: 'Resuelve problemas con números & fracciones <bien>.' },
        { ref: 'H3', text: 'nueva' }, // celda que no existía en la fila
        { ref: 'B20', text: 'fila nueva' }, // fila que no existía
      ]);
      const out = await wb.toBuffer();
      const again = await XlsxWorkbook.open(out);
      const c2 = await again.readCells(again.getSheet('063-MATE')!);
      expect(c2.get('D3')).toBe('AD');
      expect(c2.get('E3')).toBe('Resuelve problemas con números & fracciones <bien>.');
      expect(c2.get('H3')).toBe('nueva');
      expect(c2.get('B20')).toBe('fila nueva');
      expect(c2.get('D4')).toBe('A'); // lo demás intacto

      const xml = await (await JSZip.loadAsync(out)).file('xl/worksheets/sheet3.xml')!.async('string');
      const p = prefix ? `${prefix}:` : '';
      expect(xml).toContain(`<${p}c r="D3" s="6" t="s">`); // conserva el estilo de la celda
      expect(xml).toContain(`<${p}dataValidation type="list" sqref="D3">`); // y la lista desplegable
      expect(xml.indexOf('r="H3"')).toBeGreaterThan(xml.indexOf('r="G3"')); // orden de columnas
      const sst = await (await JSZip.loadAsync(out)).file('xl/sharedStrings.xml')!.async('string');
      expect(sst).toMatch(/uniqueCount="\d+"/);
      expect(sst).toContain('&amp; fracciones &lt;bien&gt;');
    });
  }

  it('rechaza archivos que no son xlsx', async () => {
    await expect(XlsxWorkbook.open(Buffer.from('no es un zip'))).rejects.toThrow(/Excel/);
  });
});

describe('plantilla RegNotas', () => {
  it('lee parámetros, áreas, competencias y estudiantes', async () => {
    for (const prefix of ['', 'x']) {
      const t = await parseRegNotas(await TEMPLATE(prefix), 'RegNotas_test.xlsx');
      expect(t.level).toBe('PRIMARY');
      expect(t.grade).toBe(3);
      expect(t.section).toBe('A');
      expect(t.periodNumber).toBe(1);
      expect(t.year).toBe(2026);
      const mat = t.areas[0];
      expect(mat.areaCode).toBe('MAT');
      expect(mat.fullName).toBe('MATEMÁTICA');
      expect(mat.competences.map((c) => [c.label, c.cnebNumber, c.conclusionCol])).toEqual([['01', 23, 5], ['02', 25, 7]]);
      expect(mat.students.map((s) => s.studentCode)).toEqual(['23149880700070', '23149880700071']);
    }
  });

  it('reconoce las hojas del SIAGIE, incluidas las transversales', () => {
    expect(resolveSheetArea('CAST SEGNL', '')).toEqual({ area: 'C2L' });
    expect(resolveSheetArea('INGLES EXT', '')).toEqual({ area: 'ING' });
    expect(resolveSheetArea('DESARR PCC', '')).toEqual({ area: 'DPCC' });
    expect(resolveSheetArea('ETRA', '')).toEqual({ area: 'EPT' });
    expect(resolveSheetArea('DESEN TIC', '')).toEqual({ area: 'TRANS', only: [28] });
    expect(resolveSheetArea('GEST AUTO', '')).toEqual({ area: 'TRANS', only: [29] });
    expect(resolveSheetArea('XYZ', 'PERSONAL SOCIAL')).toEqual({ area: 'PS' });
    expect(resolveSheetArea('XYZ', 'OTRA COSA')).toBeNull();
  });

  it('asigna competencias con la leyenda aunque el orden difiera del catálogo', () => {
    // Inicial 5 años: Comunicación viene oral, lee, crea, escribe
    expect(resolveCompetences('INITIAL', 'COM', undefined, [
      'Se comunica oralmente en su lengua materna', 'Lee diversos tipos de texto en su lengua materna',
      'Crea proyectos desde los lenguajes del arte', 'Escribe diversos tipos de texto en su lengua materna',
    ])).toEqual([7, 8, 6, 9]);
    // Inicial 3 años: sin "escribe"
    expect(resolveCompetences('INITIAL', 'COM', undefined, [
      'Se comunica oralmente en su lengua materna', 'Lee diversos tipos de texto en su lengua materna', 'Crea proyectos desde los lenguajes del arte',
    ])).toEqual([7, 8, 6]);
    // Inglés en secundaria trae leyendas genéricas
    expect(resolveCompetences('SECONDARY', 'ING', undefined, ['Se comunica oralmente', 'Lee diversos tipos de textos escritos', 'Escribe diversos tipos de textos'])).toEqual([13, 14, 15]);
    // Personal Social de inicial incluye la competencia religiosa
    expect(resolveCompetences('INITIAL', 'PS', undefined, ['Construye su identidad', 'Convive y participa democráticamente', 'Construye su identidad, como persona humana, amada por Dios'])).toEqual([1, 16, 30]);
    expect(resolveCompetences('PRIMARY', 'TRANS', [29], ['Gestiona su Aprendizaje de manera autónoma'])).toEqual([29]);
  });
});
