/**
 * Reglas de situación final (promoción / recuperación / permanencia).
 *
 * IMPORTANTE: los valores por defecto deben ser validados por la Dirección del colegio contra el texto
 * vigente de la RVM N.° 094-2020-MINEDU y sus modificatorias. Cada colegio puede ajustarlos por año
 * académico en AcademicYear.promotionRulesConfig. La situación calculada es SIEMPRE una sugerencia
 * que la Dirección debe confirmar antes del acta oficial.
 */

export type Letter = 'AD' | 'A' | 'B' | 'C';
export type FinalSituation = 'PROMOTED' | 'RECOVERY' | 'RETAINED' | 'TRANSFERRED' | 'WITHDRAWN';

export interface PromotionRuleConfig {
  /** Cuándo se considera desaprobada un área según la proporción de competencias en "C". */
  areaFailedWhen: 'HALF_OR_MORE_C' | 'MORE_THAN_HALF_C';
  /** Desde cuántas áreas desaprobadas corresponde permanencia. */
  retainedMinFailedAreas: number;
  /** Desde cuántas áreas desaprobadas corresponde recuperación (y menos que retainedMinFailedAreas). */
  recoveryMinFailedAreas: number;
  /** Códigos de área que no cuentan para la situación final (por ejemplo, competencias transversales). */
  excludedAreaCodes: string[];
}

export type PromotionRuleOverrides = Partial<Record<'PRIMARY' | 'SECONDARY', Partial<PromotionRuleConfig>>>;

export const DEFAULT_PROMOTION_RULES: Record<'PRIMARY' | 'SECONDARY', PromotionRuleConfig> = {
  PRIMARY: { areaFailedWhen: 'HALF_OR_MORE_C', retainedMinFailedAreas: 4, recoveryMinFailedAreas: 1, excludedAreaCodes: ['TRANS'] },
  SECONDARY: { areaFailedWhen: 'HALF_OR_MORE_C', retainedMinFailedAreas: 4, recoveryMinFailedAreas: 1, excludedAreaCodes: ['TRANS'] },
};

export interface AreaLetters {
  areaCode: string;
  letters: Letter[];
}

export interface FinalSituationInput {
  educationLevel: 'INITIAL' | 'PRIMARY' | 'SECONDARY' | string;
  grade: number;
  enrollmentState: 'REGISTERED' | 'TRANSFERRED' | 'WITHDRAWN' | string;
  areas: AreaLetters[];
}

export interface FinalSituationResult {
  situation: FinalSituation;
  failedAreasCount: number;
  failedAreaCodes: string[];
  isProvisional: true;
}

export function isAreaFailed(letters: Letter[], mode: PromotionRuleConfig['areaFailedWhen']): boolean {
  if (letters.length === 0) return false;
  const cCount = letters.filter((l) => l === 'C').length;
  return mode === 'HALF_OR_MORE_C' ? cCount * 2 >= letters.length : cCount * 2 > letters.length;
}

export function resolveRules(level: 'PRIMARY' | 'SECONDARY', overrides?: PromotionRuleOverrides | null): PromotionRuleConfig {
  return { ...DEFAULT_PROMOTION_RULES[level], ...(overrides?.[level] ?? {}) };
}

export function evaluateFinalSituation(
  input: FinalSituationInput,
  overrides?: PromotionRuleOverrides | null,
): FinalSituationResult {
  const base = { failedAreasCount: 0, failedAreaCodes: [] as string[], isProvisional: true as const };

  if (input.enrollmentState === 'WITHDRAWN') return { ...base, situation: 'WITHDRAWN' };
  if (input.enrollmentState === 'TRANSFERRED') return { ...base, situation: 'TRANSFERRED' };

  const level = String(input.educationLevel).toUpperCase();
  if (level === 'INITIAL' || (level === 'PRIMARY' && input.grade === 1)) {
    return { ...base, situation: 'PROMOTED' };
  }

  const rules = resolveRules(level === 'SECONDARY' ? 'SECONDARY' : 'PRIMARY', overrides);
  const excluded = rules.excludedAreaCodes.map((c) => c.toUpperCase());

  const failedAreaCodes = input.areas
    .filter((area) => !excluded.some((code) => area.areaCode.toUpperCase().includes(code)))
    .filter((area) => isAreaFailed(area.letters, rules.areaFailedWhen))
    .map((area) => area.areaCode);

  const failedAreasCount = failedAreaCodes.length;
  let situation: FinalSituation = 'PROMOTED';
  if (failedAreasCount >= rules.retainedMinFailedAreas) situation = 'RETAINED';
  else if (failedAreasCount >= rules.recoveryMinFailedAreas) situation = 'RECOVERY';

  return { situation, failedAreasCount, failedAreaCodes, isProvisional: true };
}
