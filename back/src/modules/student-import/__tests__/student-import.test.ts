import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { COLUMN_KEYS, IMPORT_COLUMNS, type RawRow } from '../student-import.columns';
import { checkDocument, cleanIdentifier, parseDate, parseImportRow } from '../student-import.rules';
import { buildImportWorkbook, readImportWorkbook } from '../student-import.workbook';

const TODAY = new Date('2026-11-15T12:00:00Z');
const blank = (): RawRow => Object.fromEntries(COLUMN_KEYS.map((key) => [key, ''])) as RawRow;
const validRow = (overrides: Partial<RawRow> = {}): RawRow => ({
  ...blank(),
  lastNamePaternal: 'Quispe', lastNameMaternal: 'Mamani', firstNames: 'Lucía Valentina', documentId: '07654321',
  gender: 'Mujer', birthDate: '15/03/2015', classroom: '3.° Primaria "A"',
  guardianRelationship: 'Madre', guardianLastNamePaternal: 'Mamani', guardianFirstName: 'Rosa', guardianDocumentId: '41234567',
  ...overrides,
});

describe('reglas de la carga masiva', () => {
  it('acepta una fila con solo los datos obligatorios y aplica los valores por defecto', () => {
    const row = parseImportRow(validRow(), 3, TODAY);
    expect(row.issues).toEqual([]);
    expect(row.student).toMatchObject({ firstNames: 'LUCÍA VALENTINA', documentType: 'DNI', documentId: '07654321', gender: 'FEMALE' });
    expect(row.student?.birthDate.toISOString().slice(0, 10)).toBe('2015-03-15');
    expect(row.enrollment).toMatchObject({ condition: 'CONTINUO', repeatingGrade: false });
    expect(row.guardian).toMatchObject({ relationshipType: 'MOTHER', documentType: 'DNI', livesWithStudent: true, email: null });
    expect(row.secondGuardian).toBeNull();
  });

  it('recupera los ceros que Excel le quita al DNI y avisa', () => {
    const row = parseImportRow(validRow({ documentId: '7654321' }), 3, TODAY);
    expect(row.student?.documentId).toBe('07654321');
    expect(row.warnings.join(' ')).toContain('ceros a la izquierda');
  });

  it('lee fechas escritas como texto, ISO o número de serie de Excel', () => {
    expect(parseDate('5/3/2015')?.toISOString().slice(0, 10)).toBe('2015-03-05');
    expect(parseDate('2015-03-05')?.toISOString().slice(0, 10)).toBe('2015-03-05');
    expect(parseDate('42068')?.toISOString().slice(0, 10)).toBe('2015-03-05');
    expect(parseDate('31/02/2015')).toBeNull();
    expect(parseDate('03/15/2015')).toBeNull();
  });

  it('limpia identificadores que Excel guardó como número', () => {
    expect(cleanIdentifier('9.87654321E8')).toBe('987654321');
    expect(cleanIdentifier('41234567.0')).toBe('41234567');
    expect(checkDocument('DNI', '1234', 'del alumno').issue).toContain('8 dígitos');
    expect(checkDocument('CE', '001234567', 'del alumno').issue).toBeNull();
  });

  it('rechaza la fila cuando faltan datos obligatorios y dice cuáles', () => {
    const row = parseImportRow(validRow({ gender: '', birthDate: 'ayer', guardianDocumentId: '' }), 4, TODAY);
    expect(row.student).toBeNull();
    expect(row.issues).toEqual(expect.arrayContaining([
      'Falta el sexo del alumno.',
      expect.stringContaining('Fecha de nacimiento no válida'),
      'Falta el número de documento del apoderado.',
    ]));
  });

  it('rechaza al apoderado con el mismo documento que el alumno', () => {
    const row = parseImportRow(validRow({ guardianDocumentId: '07654321' }), 3, TODAY);
    expect(row.issues.join(' ')).toContain('mismo número de documento que el alumno');
  });

  it('carga al alumno aunque el segundo apoderado esté incompleto, y lo avisa', () => {
    const row = parseImportRow(validRow({ guardian2FirstName: 'José', guardian2LastNamePaternal: 'Quispe' }), 3, TODAY);
    expect(row.issues).toEqual([]);
    expect(row.secondGuardian).toBeNull();
    expect(row.warnings.join(' ')).toContain('El segundo apoderado no se carga');
  });

  it('registra al segundo apoderado completo y descarta contactos inválidos sin bloquear', () => {
    const row = parseImportRow(validRow({
      guardianCellphone: '12345', guardianEmail: 'no-es-correo',
      guardian2Relationship: 'Padre', guardian2FirstName: 'José', guardian2LastNamePaternal: 'Quispe', guardian2DocumentId: '40987654', guardian2Cellphone: '+51 912 345 678',
    }), 3, TODAY);
    expect(row.issues).toEqual([]);
    expect(row.guardian).toMatchObject({ cellphone: null, email: null });
    expect(row.secondGuardian).toMatchObject({ relationshipType: 'FATHER', documentId: '40987654', cellphone: '912345678' });
    expect(row.warnings).toHaveLength(2);
  });
});

describe('plantilla Excel', () => {
  const input = { schoolName: 'Colegio Prueba', year: 2026, classroomLabels: ['3.° Primaria "A"', '3.° Primaria "B"'] };

  it('la plantilla vacía no trae alumnos: la fila de ejemplo no se importa', async () => {
    const read = await readImportWorkbook(await buildImportWorkbook(input));
    expect(read.rows).toEqual([]);
    expect(read.missingOptionalColumns).toEqual([]);
  });

  it('trae listas desplegables y deja los documentos como texto', async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await buildImportWorkbook(input) as unknown as ExcelJS.Buffer);
    const sheet = workbook.getWorksheet('Alumnos')!;
    const columnOf = (key: string): number => IMPORT_COLUMNS.findIndex((column) => column.key === key) + 1;
    expect(sheet.getCell(5, columnOf('classroom')).dataValidation).toMatchObject({ type: 'list' });
    expect(sheet.getCell(5, columnOf('gender')).dataValidation).toMatchObject({ type: 'list' });
    expect(sheet.getColumn(columnOf('documentId')).numFmt).toBe('@');
    expect(workbook.getWorksheet('Listas')?.state).toBe('hidden');
    expect(workbook.getWorksheet('Instrucciones')).toBeDefined();
  });

  it('lee lo que el colegio llena, aunque Excel haya guardado números y fechas', async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await buildImportWorkbook(input) as unknown as ExcelJS.Buffer);
    const sheet = workbook.getWorksheet('Alumnos')!;
    const set = (rowNumber: number, key: string, value: ExcelJS.CellValue): void => {
      sheet.getCell(rowNumber, IMPORT_COLUMNS.findIndex((column) => column.key === key) + 1).value = value;
    };
    set(4, 'lastNamePaternal', 'Quispe'); set(4, 'firstNames', 'Lucía'); set(4, 'documentId', 7654321); set(4, 'gender', 'Mujer');
    set(4, 'birthDate', new Date(Date.UTC(2015, 2, 5))); set(4, 'classroom', '3.° Primaria "B"');
    set(4, 'guardianRelationship', 'Madre'); set(4, 'guardianLastNamePaternal', 'Mamani'); set(4, 'guardianFirstName', 'Rosa'); set(4, 'guardianDocumentId', '41234567');
    const read = await readImportWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()));
    expect(read.rows).toHaveLength(1);
    expect(read.rows[0].rowNumber).toBe(4);
    const parsed = parseImportRow(read.rows[0].raw, 4, TODAY);
    expect(parsed.issues).toEqual([]);
    expect(parsed.student).toMatchObject({ documentId: '07654321', lastNamePaternal: 'QUISPE' });
    expect(parsed.student?.birthDate.toISOString().slice(0, 10)).toBe('2015-03-05');
  });

  it('el archivo de rechazadas conserva los datos y se puede volver a subir', async () => {
    const raw = validRow({ gender: '' });
    const read = await readImportWorkbook(await buildImportWorkbook({ ...input, rejected: [{ raw, reason: 'Falta el sexo del alumno.' }] }));
    expect(read.rows).toHaveLength(1);
    expect(read.rows[0].raw).toEqual(raw);
  });

  it('explica el problema cuando el archivo no es la plantilla', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Hoja1').addRow(['Nombre', 'Edad']);
    await expect(readImportWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()))).rejects.toThrow('no es la plantilla');
  });
});
