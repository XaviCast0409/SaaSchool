import type { ResultLetter } from '../types';

export type ParsedCell = { numericScore: number | null; literalScore: ResultLetter | null } | 'invalid';

/** Acepta vacío, AD/A/B/C/EXO o un número de 0 a 20 (con coma o punto). */
export function parseCell(raw: string): ParsedCell {
  const v = raw.trim().toUpperCase();
  if (v === '') return { numericScore: null, literalScore: null };
  if (v === 'AD' || v === 'A' || v === 'B' || v === 'C' || v === 'EXO') return { numericScore: null, literalScore: v };
  const n = Number(v.replace(',', '.'));
  if (Number.isFinite(n) && n >= 0 && n <= 20) return { numericScore: Math.round(n * 10) / 10, literalScore: null };
  return 'invalid';
}

export function formatCell(score: { numericScore: number | null; literalScore: string | null } | undefined): string {
  if (!score) return '';
  if (score.numericScore !== null && score.numericScore !== undefined) return String(score.numericScore);
  return score.literalScore ?? '';
}

/** Convierte texto pegado desde Excel en una matriz de celdas. */
export function parseClipboard(text: string): string[][] {
  return text.replace(/\r/g, '').split('\n').filter((line, i, arr) => line !== '' || i < arr.length - 1).map((line) => line.split('\t'));
}

