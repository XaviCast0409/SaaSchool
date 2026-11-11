import { describe, it, expect } from 'vitest';
import { CNEB_AREAS, CNEB_COMPETENCES, matchCnebNumberByName, legacyAreaCode, getOfficialArea } from '../cneb.catalog';

describe('Catálogo CNEB', () => {
  it('tiene las 31 competencias numeradas', () => {
    expect(Object.keys(CNEB_COMPETENCES)).toHaveLength(31);
  });

  it('cada área referencia competencias existentes y no repite competencias en el mismo nivel', () => {
    for (const level of ['INITIAL', 'PRIMARY', 'SECONDARY'] as const) {
      const seen = new Set<number>();
      for (const area of CNEB_AREAS[level]) {
        for (const n of area.competences) {
          expect(CNEB_COMPETENCES[n]).toBeDefined();
          expect(seen.has(n)).toBe(false);
          seen.add(n);
        }
      }
    }
  });

  it('Inicial: Matemática tiene cantidad y forma; Comunicación incluye Crea proyectos', () => {
    expect(getOfficialArea('INITIAL', 'MAT')?.competences).toEqual([23, 25]);
    expect(getOfficialArea('INITIAL', 'COM')?.competences).toContain(6);
  });

  it('empareja nombres antiguos con el número CNEB', () => {
    expect(matchCnebNumberByName('Lee diversos tipos de textos escritos')).toBe(8);
    expect(matchCnebNumberByName('Construye su identidad, como persona humana, amada por Dios')).toBe(30);
    expect(matchCnebNumberByName('Construye su identidad')).toBe(1);
    expect(matchCnebNumberByName('Lee diversos tipos de textos escritos en inglés')).toBe(14);
    expect(matchCnebNumberByName('Resuelve problemas de forma, movimiento y localización')).toBe(25);
    expect(matchCnebNumberByName('Aplica habilidades técnicas en computación')).toBeNull();
  });

  it('deduce el área oficial de códigos antiguos sin confundir EPT-COM con Comunicación', () => {
    expect(legacyAreaCode('EPT-COM')).toBeNull();
    expect(legacyAreaCode('AYC-SEC')).toBe('ART');
    expect(legacyAreaCode('ER-SEC')).toBe('REL');
    expect(legacyAreaCode('MAT-ALG')).toBe('MAT');
    expect(legacyAreaCode('PS-INI')).toBe('PS');
    expect(legacyAreaCode('PSI-INI')).toBe('PSI');
    expect(legacyAreaCode(null, null, 'Ciencias Sociales (Secundaria)')).toBe('CCSS');
  });
});
