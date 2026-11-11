import { scoreToLetter, type LetterScaleThresholds } from '../grades/letter-scale';

export type Letter = 'AD' | 'A' | 'B' | 'C';
export type ResultLetter = Letter | 'EXO';
export type AnnualMode = 'LAST_PERIOD' | 'AVERAGE';

/** Valor numérico de cada nivel de logro al combinar calificativos literales. Único en todo el sistema. */
export const LETTER_NUMERIC_VALUE: Record<Letter, number> = { AD: 19, A: 15, B: 12, C: 8 };

/** Máximo de caracteres de la conclusión descriptiva. VALIDAR con la plantilla SIAGIE vigente. */
export const CONCLUSION_MAX_LENGTH = 300;

export const LETTERS_REQUIRING_CONCLUSION: Letter[] = ['B', 'C'];

export const isLetter = (value: unknown): value is Letter =>
  value === 'AD' || value === 'A' || value === 'B' || value === 'C';

export const isResultLetter = (value: unknown): value is ResultLetter => isLetter(value) || value === 'EXO';

const round1 = (n: number) => Math.round(n * 10) / 10;

export interface CriterionScoreInput {
  weight: number;
  numericScore: number | null;
  literalScore: string | null;
  isExonerated: boolean;
}

/** Calificativo sugerido de una competencia en un periodo a partir de sus criterios. */
export function computeCompetencePeriod(
  scores: CriterionScoreInput[],
  thresholds: LetterScaleThresholds,
): { computedScore: number | null; suggestedLetter: ResultLetter | null } {
  if (scores.some((s) => s.isExonerated || s.literalScore === 'EXO')) {
    return { computedScore: null, suggestedLetter: 'EXO' };
  }
  const values = scores
    .map((s) => ({
      value: s.numericScore ?? (isLetter(s.literalScore) ? LETTER_NUMERIC_VALUE[s.literalScore] : null),
      weight: s.weight > 0 ? s.weight : 1,
    }))
    .filter((v): v is { value: number; weight: number } => v.value !== null && !Number.isNaN(v.value));
  if (values.length === 0) return { computedScore: null, suggestedLetter: null };
  const totalWeight = values.reduce((acc, v) => acc + v.weight, 0);
  const score = round1(values.reduce((acc, v) => acc + v.value * v.weight, 0) / totalWeight);
  return { computedScore: score, suggestedLetter: scoreToLetter(score, thresholds) };
}

/** La nota de juicio del docente prevalece sobre la sugerida. */
export function resolveFinalLetter(
  suggested: ResultLetter | null,
  override: ResultLetter | null | undefined,
): ResultLetter | null {
  return override ?? suggested;
}

export interface ConsolidationPart {
  finalLetter: ResultLetter | null;
  computedScore: number | null;
  isOverridden: boolean;
  weight: number;
}

/**
 * Combina los resultados de los cursos que tributan a UNA competencia oficial.
 * - Un solo curso: se usa su calificativo final tal cual.
 * - Varios cursos: promedio ponderado (puntaje calculado si no hubo ajuste; valor del nivel si hubo ajuste).
 */
export function consolidateOfficialCompetence(
  parts: ConsolidationPart[],
  thresholds: LetterScaleThresholds,
): { letter: ResultLetter | null; score: number | null } {
  const withLetter = parts.filter((p) => p.finalLetter !== null);
  if (withLetter.length === 0) return { letter: null, score: null };
  const graded = withLetter.filter((p) => p.finalLetter !== 'EXO');
  if (graded.length === 0) return { letter: 'EXO', score: null };
  if (graded.length === 1) {
    const only = graded[0];
    return { letter: only.finalLetter, score: only.computedScore };
  }
  const values = graded.map((p) => ({
    value: !p.isOverridden && p.computedScore !== null ? p.computedScore : LETTER_NUMERIC_VALUE[p.finalLetter as Letter],
    weight: p.weight > 0 ? p.weight : 1,
  }));
  const totalWeight = values.reduce((acc, v) => acc + v.weight, 0);
  const score = round1(values.reduce((acc, v) => acc + v.value * v.weight, 0) / totalWeight);
  return { letter: scoreToLetter(score, thresholds), score };
}

/** Calificativo anual de una competencia a partir de los calificativos de cada periodo (en orden). */
export function computeAnnual(
  periodLetters: Array<ResultLetter | null>,
  mode: AnnualMode,
  thresholds: LetterScaleThresholds,
): ResultLetter | null {
  const present = periodLetters.filter((l): l is ResultLetter => l !== null);
  if (present.length === 0) return null;
  if (mode === 'LAST_PERIOD') return present[present.length - 1];
  const graded = present.filter(isLetter);
  if (graded.length === 0) return 'EXO';
  const avg = graded.reduce((acc, l) => acc + LETTER_NUMERIC_VALUE[l], 0) / graded.length;
  return scoreToLetter(round1(avg), thresholds);
}

/** Limpia una conclusión descriptiva para el SIAGIE: una línea, sin espacios dobles, recortada. */
export function sanitizeConclusion(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, CONCLUSION_MAX_LENGTH);
}

export function needsConclusion(letter: ResultLetter | null): boolean {
  return isLetter(letter) && LETTERS_REQUIRING_CONCLUSION.includes(letter);
}

