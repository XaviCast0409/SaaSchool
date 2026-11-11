import { describe, it, expect } from 'vitest';
import {
  computeCompetencePeriod, consolidateOfficialCompetence, computeAnnual, resolveFinalLetter,
  sanitizeConclusion, needsConclusion, CONCLUSION_MAX_LENGTH,
} from '../grade-engine';

const T = { AD: 17.5, A: 13.5, B: 10.5 };

describe('computeCompetencePeriod', () => {
  it('promedia con pesos y convierte con la escala del colegio', () => {
    const r = computeCompetencePeriod(
      [
        { weight: 1, numericScore: 16, literalScore: null, isExonerated: false },
        { weight: 3, numericScore: 18, literalScore: null, isExonerated: false },
      ],
      T,
    );
    expect(r.computedScore).toBe(17.5);
    expect(r.suggestedLetter).toBe('AD');
  });
  it('respeta una escala distinta', () => {
    const r = computeCompetencePeriod([{ weight: 1, numericScore: 17.5, literalScore: null, isExonerated: false }], { AD: 18, A: 14, B: 11 });
    expect(r.suggestedLetter).toBe('A');
  });
  it('usa el valor del nivel cuando el criterio se registró en letras', () => {
    const r = computeCompetencePeriod([{ weight: 1, numericScore: null, literalScore: 'B', isExonerated: false }], T);
    expect(r.computedScore).toBe(12);
    expect(r.suggestedLetter).toBe('B');
  });
  it('exonerado gana', () => {
    expect(computeCompetencePeriod([{ weight: 1, numericScore: 10, literalScore: 'EXO', isExonerated: true }], T).suggestedLetter).toBe('EXO');
  });
  it('sin notas devuelve null', () => {
    expect(computeCompetencePeriod([], T)).toEqual({ computedScore: null, suggestedLetter: null });
  });
});

describe('resolveFinalLetter', () => {
  it('el ajuste del docente prevalece', () => {
    expect(resolveFinalLetter('B', 'A')).toBe('A');
    expect(resolveFinalLetter('B', null)).toBe('B');
  });
});

describe('consolidateOfficialCompetence', () => {
  it('un solo curso conserva su calificativo final', () => {
    expect(consolidateOfficialCompetence([{ finalLetter: 'A', computedScore: 17.4, isOverridden: false, weight: 1 }], T).letter).toBe('A');
  });
  it('varios cursos: promedio ponderado de puntajes', () => {
    const r = consolidateOfficialCompetence(
      [
        { finalLetter: 'A', computedScore: 17.4, isOverridden: false, weight: 1 },
        { finalLetter: 'AD', computedScore: 17.6, isOverridden: false, weight: 1 },
      ],
      T,
    );
    expect(r.score).toBe(17.5);
    expect(r.letter).toBe('AD');
  });
  it('si un curso fue ajustado se usa el valor del nivel', () => {
    const r = consolidateOfficialCompetence(
      [
        { finalLetter: 'C', computedScore: 12, isOverridden: true, weight: 1 },
        { finalLetter: 'B', computedScore: 12, isOverridden: false, weight: 1 },
      ],
      T,
    );
    expect(r.score).toBe(10);
    expect(r.letter).toBe('C');
  });
  it('todos exonerados', () => {
    expect(consolidateOfficialCompetence([{ finalLetter: 'EXO', computedScore: null, isOverridden: false, weight: 1 }], T).letter).toBe('EXO');
  });
});

describe('computeAnnual', () => {
  it('LAST_PERIOD toma el último periodo con calificativo', () => {
    expect(computeAnnual(['C', 'B', 'A', null], 'LAST_PERIOD', T)).toBe('A');
  });
  it('AVERAGE promedia los valores de los niveles', () => {
    expect(computeAnnual(['C', 'A', 'A', 'AD'], 'AVERAGE', T)).toBe('A');
  });
});

describe('conclusiones', () => {
  it('limpia y recorta', () => {
    expect(sanitizeConclusion('  Hola\n\nmundo  ')).toBe('Hola mundo');
    expect(sanitizeConclusion('x'.repeat(400))).toHaveLength(CONCLUSION_MAX_LENGTH);
  });
  it('B y C exigen conclusión', () => {
    expect(needsConclusion('B')).toBe(true);
    expect(needsConclusion('C')).toBe(true);
    expect(needsConclusion('A')).toBe(false);
    expect(needsConclusion('EXO')).toBe(false);
  });
});

