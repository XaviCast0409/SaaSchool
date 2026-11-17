import { describe, it, expect } from 'vitest';
import { isValidSlug, normalizeSlug, slugify, slugCandidates } from '../school-slug.rules';
import { createSchoolSchema, updateSchoolSchema } from '../school.schema';

describe('código del colegio (slug)', () => {
  it('genera el código desde el nombre, sin tildes ni signos', () => {
    expect(slugify('I.E.P. San José de Ñaña')).toBe('san-jose-de-nana');
    expect(slugify('IEP Auditoría San Martín')).toBe('auditoria-san-martin');
    expect(slugify('I.E. 1234')).toBe('1234');
    expect(slugify('Iepa Kids')).toBe('iepa-kids');
    expect(slugify('Innova Academy')).toBe('innova-academy');
    expect(slugify('  Colegio   Los Álamos  ')).toBe('colegio-los-alamos');
  });

  it('el código generado siempre es válido', () => {
    for (const name of ['Innova Academy', 'AB', 'Admin', '¡¡¡', 'x'.repeat(80), 'San Martín de Porres 2']) {
      expect(isValidSlug(slugify(name))).toBe(true);
    }
  });

  it('rechaza códigos inválidos o reservados', () => {
    expect(isValidSlug('ab')).toBe(false);
    expect(isValidSlug('Innova')).toBe(false);
    expect(isValidSlug('-innova')).toBe(false);
    expect(isValidSlug('innova-')).toBe(false);
    expect(isValidSlug('in--nova')).toBe(false);
    expect(isValidSlug('san josé')).toBe(false);
    expect(isValidSlug('admin')).toBe(false);
    expect(isValidSlug('api')).toBe(false);
    expect(isValidSlug('a'.repeat(41))).toBe(false);
    expect(isValidSlug('innova')).toBe(true);
    expect(isValidSlug('san-ignacio-2')).toBe(true);
  });

  it('normaliza lo que escribe la persona', () => {
    expect(normalizeSlug('  InNoVa ')).toBe('innova');
  });

  it('propone sufijos para códigos repetidos', () => {
    expect(slugCandidates('innova', 3)).toEqual(['innova', 'innova-2', 'innova-3']);
  });
});

describe('validación de la página de ingreso', () => {
  it('al crear, el código es opcional y se normaliza', () => {
    const base = { name: 'Innova Academy', documentId: '20609876543' };
    expect(createSchoolSchema.parse(base).slug).toBeUndefined();
    expect(createSchoolSchema.parse({ ...base, slug: '' }).slug).toBeUndefined();
    expect(createSchoolSchema.parse({ ...base, slug: ' Innova ' }).slug).toBe('innova');
    expect(() => createSchoolSchema.parse({ ...base, slug: 'mi colegio' })).toThrow();
  });

  it('textos vacíos se borran y el fondo debe ser un archivo de la plataforma', () => {
    const dto = updateSchoolSchema.parse({ loginTitle: '  ', loginMessage: 'Matrículas abiertas' });
    expect(dto.loginTitle).toBeNull();
    expect(dto.loginMessage).toBe('Matrículas abiertas');
    expect(() => updateSchoolSchema.parse({ loginBackgroundUrl: 'https://evil.example/x.png' })).toThrow();
    expect(
      updateSchoolSchema.parse({ loginBackgroundUrl: '/api/files/123e4567-e89b-12d3-a456-426614174000' }).loginBackgroundUrl,
    ).toBe('/api/files/123e4567-e89b-12d3-a456-426614174000');
    expect(updateSchoolSchema.parse({ loginBackgroundUrl: null }).loginBackgroundUrl).toBeNull();
    expect(() => updateSchoolSchema.parse({ loginMessage: 'x'.repeat(501) })).toThrow();
  });
});
