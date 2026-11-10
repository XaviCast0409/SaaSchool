export interface LetterScaleThresholds {
  AD: number;
  A: number;
  B: number;
}

export const DEFAULT_LETTER_THRESHOLDS: LetterScaleThresholds = { AD: 17.5, A: 13.5, B: 10.5 };

/** Convierte un puntaje numérico (0-20) a la escala literal CNEB según los umbrales del colegio. */
export function scoreToLetter(
  score: number | null,
  thresholds: LetterScaleThresholds = DEFAULT_LETTER_THRESHOLDS,
): 'AD' | 'A' | 'B' | 'C' | null {
  if (score === null || Number.isNaN(score)) return null;
  if (score >= thresholds.AD) return 'AD';
  if (score >= thresholds.A) return 'A';
  if (score >= thresholds.B) return 'B';
  return 'C';
}

export function thresholdsFromGradingScale(
  rows: Array<{ letterGrade: string; minNumeric: number }>,
): LetterScaleThresholds {
  const find = (letter: string, fallback: number) => rows.find((r) => r.letterGrade === letter)?.minNumeric ?? fallback;
  return {
    AD: find('AD', DEFAULT_LETTER_THRESHOLDS.AD),
    A: find('A', DEFAULT_LETTER_THRESHOLDS.A),
    B: find('B', DEFAULT_LETTER_THRESHOLDS.B),
  };
}
