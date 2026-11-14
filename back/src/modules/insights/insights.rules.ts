/**
 * Reglas puras de la alerta temprana académica (sin base de datos), para poder probarlas.
 *
 * El índice combina señales que el colegio ya registra. NO usa la deuda de pensiones: la situación
 * económica no debe influir en la valoración académica del estudiante (Ley 27665).
 */

export type RiskLevel = 'ALTO' | 'MEDIO' | 'BAJO' | 'NINGUNO';

export interface RiskInput {
  unjustifiedAbsences30: number;
  lates30: number;
  competencesInC: number;
  competencesDropped: number;
  missingHomework30: number;
  negativeIncidents30: number;
}

export interface RiskResult {
  score: number;
  level: RiskLevel;
  reasons: string[];
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Peso por señal y tope para que una sola no domine el índice. */
const RULES: Array<{ key: keyof RiskInput; weight: number; cap: number; text: (n: number) => string }> = [
  { key: 'competencesInC', weight: 3, cap: 12, text: (n) => `${plural(n, 'competencia', 'competencias')} en C` },
  { key: 'unjustifiedAbsences30', weight: 2, cap: 10, text: (n) => `${plural(n, 'falta', 'faltas')} sin justificar en 30 días` },
  { key: 'competencesDropped', weight: 2, cap: 8, text: (n) => `${plural(n, 'competencia bajó', 'competencias bajaron')} de nivel` },
  { key: 'negativeIncidents30', weight: 2, cap: 6, text: (n) => `${plural(n, 'incidencia', 'incidencias')} de conducta o citación` },
  { key: 'missingHomework30', weight: 1.5, cap: 6, text: (n) => `${plural(n, 'tarea vencida', 'tareas vencidas')} sin entregar` },
  { key: 'lates30', weight: 0.5, cap: 3, text: (n) => `${plural(n, 'tardanza', 'tardanzas')} en 30 días` },
];

export function computeRisk(input: RiskInput): RiskResult {
  let score = 0;
  const reasons: string[] = [];
  for (const rule of RULES) {
    const n = Math.max(0, input[rule.key]);
    if (!n) continue;
    score += Math.min(rule.cap, n * rule.weight);
    // Las tardanzas solo se mencionan si son varias
    if (rule.key !== 'lates30' || n >= 3) reasons.push(rule.text(n));
  }
  score = Math.round(score * 10) / 10;
  const level: RiskLevel = score >= 12 ? 'ALTO' : score >= 6 ? 'MEDIO' : score > 0 ? 'BAJO' : 'NINGUNO';
  return { score, level, reasons };
}

const RANK: Record<string, number> = { C: 1, B: 2, A: 3, AD: 4 };

/** Competencias que bajaron de nivel entre dos periodos (mismo curso y competencia). */
export function countDrops(previous: Map<string, string>, current: Map<string, string>): number {
  let drops = 0;
  for (const [key, letter] of current) {
    const before = previous.get(key);
    if (before && RANK[before] && RANK[letter] && RANK[letter] < RANK[before]) drops++;
  }
  return drops;
}

export interface LetterTally {
  AD: number;
  A: number;
  B: number;
  C: number;
  total: number;
}

export function emptyTally(): LetterTally {
  return { AD: 0, A: 0, B: 0, C: 0, total: 0 };
}

export function addLetter(t: LetterTally, letter: string | null | undefined): void {
  if (letter === 'AD' || letter === 'A' || letter === 'B' || letter === 'C') {
    t[letter]++;
    t.total++;
  }
}

/** Datos que el SIAGIE exige y faltan o están mal en la ficha del estudiante. */
export function siagieIssues(s: { documentType: string; documentId: string; studentCode: string | null; birthUbigeo: string | null; lastNameMaternal: string | null }): string[] {
  const issues: string[] = [];
  if (!s.studentCode) issues.push('Sin código de estudiante SIAGIE');
  else if (!/^\d{14}$/.test(s.studentCode)) issues.push('Código SIAGIE no tiene 14 dígitos');
  if (s.documentType === 'DNI' && !/^\d{8}$/.test(s.documentId)) issues.push('DNI no tiene 8 dígitos');
  if (!s.birthUbigeo || !/^\d{6}$/.test(s.birthUbigeo)) issues.push('Falta el ubigeo de nacimiento (6 dígitos)');
  if (!s.lastNameMaternal) issues.push('Falta el apellido materno');
  return issues;
}
