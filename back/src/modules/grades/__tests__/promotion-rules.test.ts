import { describe, it, expect } from 'vitest';
import { evaluateFinalSituation, isAreaFailed } from '../promotion-rules';
import { scoreToLetter, thresholdsFromGradingScale } from '../letter-scale';

const area = (areaCode: string, letters: Array<'AD' | 'A' | 'B' | 'C'>) => ({ areaCode, letters });

describe('isAreaFailed', () => {
  it('HALF_OR_MORE_C: 1 de 2 en C desaprueba', () => expect(isAreaFailed(['C', 'A'], 'HALF_OR_MORE_C')).toBe(true));
  it('HALF_OR_MORE_C: 1 de 3 en C aprueba', () => expect(isAreaFailed(['C', 'A', 'B'], 'HALF_OR_MORE_C')).toBe(false));
  it('MORE_THAN_HALF_C: 1 de 2 en C aprueba', () => expect(isAreaFailed(['C', 'A'], 'MORE_THAN_HALF_C')).toBe(false));
  it('sin competencias no desaprueba', () => expect(isAreaFailed([], 'HALF_OR_MORE_C')).toBe(false));
});

describe('evaluateFinalSituation', () => {
  const base = { enrollmentState: 'REGISTERED', grade: 3 };

  it('Inicial siempre promueve', () => {
    const r = evaluateFinalSituation({ ...base, educationLevel: 'INITIAL', areas: [area('MAT', ['C', 'C'])] });
    expect(r.situation).toBe('PROMOTED');
  });
  it('1.° de primaria promueve automáticamente', () => {
    const r = evaluateFinalSituation({ ...base, grade: 1, educationLevel: 'PRIMARY', areas: [area('MAT', ['C', 'C'])] });
    expect(r.situation).toBe('PROMOTED');
  });
  it('una sola C aislada NO manda a recuperación', () => {
    const r = evaluateFinalSituation({ ...base, educationLevel: 'SECONDARY', areas: [area('MAT', ['C', 'A', 'A'])] });
    expect(r.situation).toBe('PROMOTED');
  });
  it('1 área desaprobada → recuperación', () => {
    const r = evaluateFinalSituation({ ...base, educationLevel: 'SECONDARY', areas: [area('MAT', ['C', 'A'])] });
    expect(r.situation).toBe('RECOVERY');
    expect(r.failedAreasCount).toBe(1);
  });
  it('3 áreas desaprobadas → recuperación', () => {
    const areas = ['MAT', 'COM', 'CYT'].map((c) => area(c, ['C', 'C']));
    expect(evaluateFinalSituation({ ...base, educationLevel: 'SECONDARY', areas }).situation).toBe('RECOVERY');
  });
  it('4 áreas desaprobadas → permanencia', () => {
    const areas = ['MAT', 'COM', 'CYT', 'CCSS'].map((c) => area(c, ['C', 'C']));
    expect(evaluateFinalSituation({ ...base, educationLevel: 'PRIMARY', areas }).situation).toBe('RETAINED');
  });
  it('competencias transversales no cuentan', () => {
    const r = evaluateFinalSituation({ ...base, educationLevel: 'SECONDARY', areas: [area('TRANS', ['C', 'C'])] });
    expect(r.situation).toBe('PROMOTED');
  });
  it('retirado y trasladado', () => {
    expect(evaluateFinalSituation({ ...base, enrollmentState: 'WITHDRAWN', educationLevel: 'PRIMARY', areas: [] }).situation).toBe('WITHDRAWN');
    expect(evaluateFinalSituation({ ...base, enrollmentState: 'TRANSFERRED', educationLevel: 'PRIMARY', areas: [] }).situation).toBe('TRANSFERRED');
  });
  it('overrides por colegio', () => {
    const r = evaluateFinalSituation(
      { ...base, educationLevel: 'SECONDARY', areas: [area('MAT', ['C', 'A'])] },
      { SECONDARY: { areaFailedWhen: 'MORE_THAN_HALF_C' } },
    );
    expect(r.situation).toBe('PROMOTED');
  });
  it('siempre es provisional', () => {
    expect(evaluateFinalSituation({ ...base, educationLevel: 'PRIMARY', areas: [] }).isProvisional).toBe(true);
  });
});

describe('scoreToLetter', () => {
  it('umbrales por defecto', () => {
    expect(scoreToLetter(18)).toBe('AD');
    expect(scoreToLetter(14)).toBe('A');
    expect(scoreToLetter(11)).toBe('B');
    expect(scoreToLetter(10)).toBe('C');
    expect(scoreToLetter(null)).toBeNull();
  });
  it('umbrales personalizados', () => {
    const t = thresholdsFromGradingScale([{ letterGrade: 'AD', minNumeric: 18 }, { letterGrade: 'A', minNumeric: 14 }, { letterGrade: 'B', minNumeric: 11 }]);
    expect(scoreToLetter(17.5, t)).toBe('A');
    expect(scoreToLetter(10.9, t)).toBe('C');
  });
});
