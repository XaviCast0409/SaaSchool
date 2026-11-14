import { describe, it, expect } from 'vitest';
import { addLetter, computeRisk, countDrops, emptyTally, siagieIssues } from '../insights.rules';

const zero = { unjustifiedAbsences30: 0, lates30: 0, competencesInC: 0, competencesDropped: 0, missingHomework30: 0, negativeIncidents30: 0 };

describe('alerta temprana académica', () => {
  it('sin señales no hay riesgo', () => {
    expect(computeRisk(zero)).toEqual({ score: 0, level: 'NINGUNO', reasons: [] });
  });

  it('combina señales con topes y explica los motivos', () => {
    const r = computeRisk({ ...zero, competencesInC: 2, unjustifiedAbsences30: 3, missingHomework30: 1 });
    expect(r.score).toBe(13.5);
    expect(r.level).toBe('ALTO');
    expect(r.reasons).toEqual(['2 competencias en C', '3 faltas sin justificar en 30 días', '1 tarea vencida sin entregar']);
  });

  it('una sola señal no supera su tope', () => {
    expect(computeRisk({ ...zero, unjustifiedAbsences30: 20 }).score).toBe(10);
    expect(computeRisk({ ...zero, unjustifiedAbsences30: 20 }).level).toBe('MEDIO');
  });

  it('las tardanzas suman poco y solo se mencionan si son varias', () => {
    const r = computeRisk({ ...zero, lates30: 2 });
    expect(r.level).toBe('BAJO');
    expect(r.reasons).toEqual([]);
    expect(computeRisk({ ...zero, lates30: 4 }).reasons).toEqual(['4 tardanzas en 30 días']);
  });

  it('cuenta las competencias que bajaron de nivel', () => {
    const prev = new Map([['mat|c1', 'A'], ['mat|c2', 'B'], ['com|c1', 'AD']]);
    const cur = new Map([['mat|c1', 'B'], ['mat|c2', 'B'], ['com|c1', 'A'], ['cyt|c1', 'C']]);
    expect(countDrops(prev, cur)).toBe(2);
  });
});

describe('mapa de calor y datos SIAGIE', () => {
  it('cuenta solo calificativos válidos', () => {
    const t = emptyTally();
    ['AD', 'A', 'B', 'C', 'EXO', null, 'A'].forEach((l) => addLetter(t, l));
    expect(t).toEqual({ AD: 1, A: 2, B: 1, C: 1, total: 5 });
  });

  it('detecta datos faltantes para el SIAGIE', () => {
    expect(siagieIssues({ documentType: 'DNI', documentId: '70100001', studentCode: '15040000015838', birthUbigeo: '150101', lastNameMaternal: 'Torres' })).toEqual([]);
    const issues = siagieIssues({ documentType: 'DNI', documentId: '7010', studentCode: null, birthUbigeo: null, lastNameMaternal: null });
    expect(issues).toHaveLength(4);
    expect(siagieIssues({ documentType: 'CE', documentId: 'X123', studentCode: '123', birthUbigeo: '150101', lastNameMaternal: 'A' })).toEqual(['Código SIAGIE no tiene 14 dígitos']);
  });
});
