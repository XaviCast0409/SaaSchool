import { describe, expect, it } from 'vitest';
import { CNEB_AREAS, CNEB_COMPETENCES } from '../../academic/cneb.catalog';
import { PREUNIVERSITY_COURSES, preuniversityCoursesFor } from '../../academic/preuniversity.catalog';
import { COMPETENCE_FRAGMENTS, COURSE_FRAGMENTS, factoryPhrases, isFactoryPhraseKey, PHRASE_LETTERS } from '../../academic/phrase-bank.catalog';
import { parseDate, parseDocumentType, parseEnrollmentState, parseGradeText, parseLevel, parseShift } from '../nomina.parser';

describe('catálogo preuniversitario', () => {
  it('tiene 21 cursos con claves únicas (18 de San Marcos)', () => {
    expect(PREUNIVERSITY_COURSES).toHaveLength(21);
    expect(new Set(PREUNIVERSITY_COURSES.map((c) => c.key)).size).toBe(21);
    expect(PREUNIVERSITY_COURSES.filter((c) => c.sanMarcos)).toHaveLength(18);
  });

  it('cada curso evalúa solo competencias de su área madre en cada nivel', () => {
    for (const course of PREUNIVERSITY_COURSES) {
      for (const [level, cfg] of Object.entries(course.levels)) {
        const area = CNEB_AREAS[level as keyof typeof CNEB_AREAS].find((a) => a.code === cfg!.areaCode);
        expect(area, `${course.key} en ${level}`).toBeDefined();
        cfg!.competences.forEach((n) => expect(area!.competences, `${course.key} C${n}`).toContain(n));
      }
    }
  });

  it('con los cursos de secundaria se pueden cubrir todas las competencias de cada área madre', () => {
    for (const code of ['MAT', 'COM', 'CCSS', 'DPCC', 'CYT']) {
      const area = CNEB_AREAS.SECONDARY.find((a) => a.code === code)!;
      const covered = new Set(preuniversityCoursesFor('SECONDARY', code).flatMap((c) => c.competences));
      expect(area.competences.filter((n) => !covered.has(n)), code).toEqual([]);
    }
  });
});

describe('banco de frases de fábrica', () => {
  it('hay fragmentos para las 31 competencias y para cada curso del catálogo', () => {
    for (const n of Object.keys(CNEB_COMPETENCES)) expect(COMPETENCE_FRAGMENTS[Number(n)]?.length, `C${n}`).toBeGreaterThanOrEqual(3);
    for (const c of PREUNIVERSITY_COURSES) expect(COURSE_FRAGMENTS[c.key]?.length, c.key).toBeGreaterThanOrEqual(3);
  });

  it('todas las frases cumplen el largo del SIAGIE y tienen clave única', () => {
    const keys = new Set<string>();
    for (const n of Object.keys(CNEB_COMPETENCES).map(Number)) {
      for (const level of ['INITIAL', 'PRIMARY', 'SECONDARY'] as const) {
        const list = factoryPhrases({ cnebNumber: n, level });
        expect(list.length).toBeGreaterThanOrEqual(PHRASE_LETTERS.length * 9);
        for (const p of list) {
          expect(p.text.length).toBeGreaterThanOrEqual(10);
          expect(p.text.length).toBeLessThanOrEqual(500);
          expect(p.text).not.toMatch(/\{|\}/);
          expect(isFactoryPhraseKey(p.key)).toBe(true);
          if (level === 'PRIMARY') { expect(keys.has(p.key)).toBe(false); keys.add(p.key); }
        }
      }
    }
  });

  it('las frases del curso aparecen primero y se filtran por nivel de logro', () => {
    const list = factoryPhrases({ cnebNumber: 24, level: 'SECONDARY', courseKey: 'ALGEBRA', letter: 'B' });
    expect(list.every((p) => p.letter === 'B')).toBe(true);
    expect(list[0].courseKey).toBe('ALGEBRA');
    expect(list.some((p) => p.courseKey === null)).toBe(true);
    // Un curso que no evalúa esa competencia no aporta frases
    expect(factoryPhrases({ cnebNumber: 23, courseKey: 'ALGEBRA' }).every((p) => p.courseKey === null)).toBe(true);
    // Inicial habla de "su edad"
    expect(factoryPhrases({ cnebNumber: 23, level: 'INITIAL', letter: 'A' }).some((p) => p.text.includes('su edad'))).toBe(true);
  });
});

describe('parser de nómina', () => {
  it('interpreta grados, niveles y turnos del SIAGIE', () => {
    expect(parseGradeText('PRIMERO ', 'SECONDARY')).toBe(1);
    expect(parseGradeText('SEXTO', 'PRIMARY')).toBe(6);
    expect(parseGradeText('Grupo 3 años ', 'INITIAL')).toBe(3);
    expect(parseLevel('Inicial - Jardín ')).toBe('INITIAL');
    expect(parseLevel('Secundaria')).toBe('SECONDARY');
    expect(parseShift('MAÑANA')).toBe('MORNING');
    expect(parseShift('TARDE')).toBe('AFTERNOON');
  });

  it('interpreta documentos, estados y fechas', () => {
    expect(parseDocumentType('DNI')).toBe('DNI');
    expect(parseDocumentType('CARNET DE EXTRANJERÍA')).toBe('CE');
    expect(parseDocumentType('PASAPORTE')).toBe('PASSPORT');
    expect(parseEnrollmentState('DEFINITIVA')).toBe('REGISTERED');
    expect(parseEnrollmentState('TRASLADADO')).toBe('TRANSFERRED');
    expect(parseEnrollmentState('RETIRADO')).toBe('WITHDRAWN');
    expect(parseDate('02/08/2013')?.toISOString().slice(0, 10)).toBe('2013-08-02');
    expect(parseDate('45000')?.toISOString().slice(0, 10)).toBe('2023-03-15');
    expect(parseDate('xx')).toBeNull();
  });
});
