import { describe, expect, it } from 'vitest';
import { fillAcademicYear } from '../academic-year.middleware';

const YEAR = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

describe('fillAcademicYear', () => {
  it('sin año elegido no toca la petición (docentes, familias, Dirección en el año vigente)', () => {
    const req = { query: {}, body: { periodNumber: 1 } };
    fillAcademicYear(req, undefined);
    expect(req).toEqual({ query: {}, body: { periodNumber: 1 } });
  });

  it('completa el año en la consulta y en el cuerpo cuando no viene', () => {
    const req: { query: Record<string, unknown>; body: Record<string, unknown> } = { query: { level: 'PRIMARY' }, body: { changes: [] } };
    fillAcademicYear(req, YEAR);
    expect(req.query.academicYearId).toBe(YEAR);
    expect(req.body.academicYearId).toBe(YEAR);
  });

  it('respeta un año indicado explícitamente (p. ej. copiar de un año a otro)', () => {
    const req = { query: { academicYearId: OTHER }, body: { academicYearId: OTHER } };
    fillAcademicYear(req, YEAR);
    expect(req.query.academicYearId).toBe(OTHER);
    expect(req.body.academicYearId).toBe(OTHER);
  });

  it('no modifica cuerpos que no son objetos', () => {
    const list = [{ a: 1 }];
    const req = { query: {} as Record<string, unknown>, body: list as unknown };
    fillAcademicYear(req, YEAR);
    expect(req.body).toEqual([{ a: 1 }]);
    expect(req.query.academicYearId).toBe(YEAR);
  });
});
