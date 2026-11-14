/**
 * Reglas puras del banco de recursos y de las rúbricas (sin base de datos).
 */

export const RESOURCE_KINDS = ['SESION', 'FICHA', 'EVALUACION', 'GUIA', 'PRESENTACION', 'OTRO'] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];

export const RUBRIC_LEVELS = ['AD', 'A', 'B', 'C'] as const;
export type RubricLevel = (typeof RUBRIC_LEVELS)[number];

export interface RubricCriterion {
  name: string;
  levels: Record<RubricLevel, string>;
}

export const RUBRIC_MAX_CRITERIA = 10;

/** Limpia y valida los criterios de una rúbrica. Devuelve los criterios listos o un mensaje de error. */
export function normalizeRubric(criteria: Array<{ name: string; levels: Partial<Record<RubricLevel, string>> }>): { criteria: RubricCriterion[] } | { error: string } {
  const clean = criteria
    .map((c) => ({
      name: (c.name ?? '').trim().replace(/\s+/g, ' '),
      levels: Object.fromEntries(RUBRIC_LEVELS.map((l) => [l, (c.levels?.[l] ?? '').trim()])) as Record<RubricLevel, string>,
    }))
    .filter((c) => c.name || RUBRIC_LEVELS.some((l) => c.levels[l]));
  if (clean.length === 0) return { error: 'Agrega al menos un criterio.' };
  if (clean.length > RUBRIC_MAX_CRITERIA) return { error: `Máximo ${RUBRIC_MAX_CRITERIA} criterios por rúbrica.` };
  for (const [i, c] of clean.entries()) {
    if (!c.name) return { error: `El criterio ${i + 1} no tiene nombre.` };
    const missing = RUBRIC_LEVELS.filter((l) => !c.levels[l]);
    if (missing.length) return { error: `«${c.name}»: falta describir el nivel ${missing.join(', ')}.` };
  }
  const names = clean.map((c) => c.name.toLowerCase());
  if (new Set(names).size !== names.length) return { error: 'Hay criterios con el mismo nombre.' };
  return { criteria: clean };
}

/** Etiquetas sin repetir, en minúsculas y sin el signo #. Máximo 8. */
export function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((t) => t.trim().replace(/^#/, '').toLowerCase()).filter((t) => t.length >= 2 && t.length <= 30))].slice(0, 8);
}

/** Solo enlaces http(s) (Drive, YouTube, Canva, etc.). */
export function isSafeLink(link: string): boolean {
  try {
    const u = new URL(link);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}
