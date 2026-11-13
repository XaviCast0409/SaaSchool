import { describe, it, expect } from 'vitest';
import {
  computeCompetencePeriod, consolidateOfficialCompetence, computeAnnual, resolveFinalLetter,
  sanitizeConclusion, needsConclusion, CONCLUSION_MAX_LENGTH, combineConclusions, fitConclusion,
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
    expect(sanitizeConclusion('x'.repeat(CONCLUSION_MAX_LENGTH + 100))).toHaveLength(CONCLUSION_MAX_LENGTH);
  });
  it('B y C exigen conclusión', () => {
    expect(needsConclusion('B')).toBe(true);
    expect(needsConclusion('C')).toBe(true);
    expect(needsConclusion('A')).toBe(false);
    expect(needsConclusion('EXO')).toBe(false);
  });
});


describe('conclusiones de varios cursos en la misma competencia', () => {
  const frase = (n: number, largo: number) => `Frase ${n} ${'a'.repeat(Math.max(0, largo - 10))}.`;

  it('si entran todas, une las dos conclusiones cerrando cada una con punto', () => {
    expect(combineConclusions([{ text: 'Resuelve ecuaciones', weight: 1 }, { text: 'Aplica identidades.', weight: 1 }]))
      .toBe('Resuelve ecuaciones. Aplica identidades.');
  });

  it('pone primero la del curso de mayor peso y no repite textos iguales', () => {
    expect(combineConclusions([{ text: 'Uno.', weight: 1 }, { text: 'Dos.', weight: 2 }, { text: 'uno.', weight: 1 }])).toBe('Dos. Uno.');
  });

  it('si no entran, deja completas las que caben empezando por el mayor peso, sin cortar a la mitad', () => {
    const a = frase(1, 300);
    const b = frase(2, 300);
    const c = frase(3, 150);
    const out = combineConclusions([{ text: a, weight: 1 }, { text: b, weight: 2 }, { text: c, weight: 1 }]);
    expect(out).toBe(`${b} ${c}`);
    expect(out.length).toBeLessThanOrEqual(CONCLUSION_MAX_LENGTH);
  });

  it('si la del curso de mayor peso sola no cabe, la recorta en la última frase completa', () => {
    const larga = `${frase(1, 200)} ${frase(2, 200)} ${frase(3, 200)}`;
    const out = combineConclusions([{ text: larga, weight: 2 }, { text: frase(4, 450), weight: 1 }]);
    expect(out).toBe(`${frase(1, 200)} ${frase(2, 200)}`);
  });

  it('sin frases completas útiles, corta en la última palabra entera y cierra con punto', () => {
    const texto = `${'palabra '.repeat(80)}final`;
    const out = fitConclusion(texto);
    expect(out.length).toBeLessThanOrEqual(CONCLUSION_MAX_LENGTH);
    expect(out.endsWith('palabra.')).toBe(true);
  });

  it('sin cursos con conclusión devuelve vacío', () => {
    expect(combineConclusions([{ text: '  ', weight: 1 }, { text: null }])).toBe('');
  });
});
