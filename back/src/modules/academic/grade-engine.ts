import { scoreToLetter, type LetterScaleThresholds } from '../grades/letter-scale';

export type Letter = 'AD' | 'A' | 'B' | 'C';
export type ResultLetter = Letter | 'EXO';
export type AnnualMode = 'LAST_PERIOD' | 'AVERAGE';

/** Valor numérico de cada nivel de logro al combinar calificativos literales. Único en todo el sistema. */
export const LETTER_NUMERIC_VALUE: Record<Letter, number> = { AD: 19, A: 15, B: 12, C: 8 };

/** Límites de la conclusión descriptiva: la plantilla SIAGIE 2026 valida entre 10 y 500 caracteres. */
export const CONCLUSION_MAX_LENGTH = 500;
export const CONCLUSION_MIN_LENGTH = 10;

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

const normalizeSpaces = (text: string) => text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

/**
 * Recorta un texto al máximo sin dejar frases o palabras a medias: corta en la última frase completa
 * (. ! ?) que entra; si no hay ninguna razonable, en la última palabra completa y cierra con punto.
 * Solo corta en seco si el texto no tiene espacios.
 */
export function fitConclusion(text: string, max = CONCLUSION_MAX_LENGTH): string {
  const clean = normalizeSpaces(text);
  if (clean.length <= max) return clean;
  const head = clean.slice(0, max + 1);
  let sentenceEnd = -1;
  for (const m of head.matchAll(/[.!?…](?=\s|$)/g)) if (m.index! < max) sentenceEnd = m.index!;
  if (sentenceEnd + 1 >= Math.max(CONCLUSION_MIN_LENGTH, Math.floor(max * 0.4))) return clean.slice(0, sentenceEnd + 1);
  const lastSpace = clean.slice(0, max).lastIndexOf(' ');
  if (lastSpace <= 0) return clean.slice(0, max);
  const words = clean.slice(0, lastSpace).replace(/[\s,;:–-]+$/, '');
  return words.length + 1 <= max ? `${words}.` : words.slice(0, max);
}

/** Limpia una conclusión descriptiva para el SIAGIE: una línea, sin espacios dobles, recortada sin cortar frases. */
export function sanitizeConclusion(text: string | null | undefined): string {
  if (!text) return '';
  return fitConclusion(text);
}

/**
 * Une las conclusiones de varios cursos que evalúan la misma competencia (p. ej. Álgebra y Trigonometría).
 * Si todas entran en el máximo del SIAGIE, van todas (de mayor a menor peso del curso). Si no, entran
 * completas las que caben, empezando por el curso de mayor peso: nunca se corta una conclusión a la mitad,
 * salvo que la del curso de mayor peso por sí sola no quepa (entonces se recorta en frase completa).
 */
export function combineConclusions(parts: Array<{ text: string | null | undefined; weight?: number }>, max = CONCLUSION_MAX_LENGTH): string {
  const seen = new Set<string>();
  const items = parts
    .map((p, i) => ({ text: normalizeSpaces(p.text ?? ''), weight: p.weight && p.weight > 0 ? p.weight : 1, i }))
    .filter((p) => {
      const k = p.text.toLowerCase();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => b.weight - a.weight || a.i - b.i);
  if (items.length === 0) return '';
  if (items.length === 1) return fitConclusion(items[0].text, max);
  const closed = items.map((p) => (/[.!?…]$/.test(p.text) ? p.text : `${p.text}.`));
  const all = closed.join(' ');
  if (all.length <= max) return all;
  // La del curso de mayor peso siempre va (recortada en frase completa si sola no cabe).
  let out = fitConclusion(closed[0], max);
  for (const t of closed.slice(1)) {
    const next = `${out} ${t}`;
    if (next.length <= max) out = next;
  }
  return out;
}

export function needsConclusion(letter: ResultLetter | null): boolean {
  return isLetter(letter) && LETTERS_REQUIRING_CONCLUSION.includes(letter);
}

