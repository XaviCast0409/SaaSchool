/**
 * Reglas puras de la re-matrícula (pasar alumnos de un año al siguiente), sin base de datos.
 */

export type Level = 'INITIAL' | 'PRIMARY' | 'SECONDARY';

/** Último grado de cada nivel (Inicial se cuenta por edad: 3, 4 y 5 años). */
export const LAST_GRADE: Record<Level, number> = { INITIAL: 5, PRIMARY: 6, SECONDARY: 5 };
const NEXT_LEVEL: Record<Level, Level | null> = { INITIAL: 'PRIMARY', PRIMARY: 'SECONDARY', SECONDARY: null };

export type GradeStep =
  | { kind: 'PROMOTE'; level: Level; grade: number }
  | { kind: 'REPEAT'; level: Level; grade: number }
  | { kind: 'GRADUATE' };

/**
 * Grado propuesto para el año siguiente.
 * - Permanece en el grado (RETAINED) → mismo grado, repitente.
 * - Si no, pasa al grado siguiente; del último grado pasa al primero del nivel siguiente
 *   (5 años → 1° primaria, 6° primaria → 1° secundaria). 5° de secundaria egresa.
 * Sin situación final registrada se propone la promoción (Dirección puede marcar "repite").
 */
export function nextGrade(level: Level, grade: number, finalSituation?: string | null): GradeStep {
  if (finalSituation === 'RETAINED') return { kind: 'REPEAT', level, grade };
  if (grade < LAST_GRADE[level]) return { kind: 'PROMOTE', level, grade: grade + 1 };
  const next = NEXT_LEVEL[level];
  return next ? { kind: 'PROMOTE', level: next, grade: 1 } : { kind: 'GRADUATE' };
}

export interface ClassroomOption {
  id: string;
  educationLevel: string;
  grade: number;
  section: string;
  shift: string;
}

/**
 * Aula propuesta del grado destino: misma sección y turno; si no existe, misma sección; luego mismo
 * turno; y si no, la primera sección del grado. null si el colegio no tiene aulas de ese grado.
 */
export function pickTargetClassroom<T extends ClassroomOption>(
  classrooms: T[],
  target: { level: string; grade: number },
  current: { section: string; shift: string },
): T | null {
  const sameGrade = classrooms
    .filter((c) => c.educationLevel === target.level && c.grade === target.grade)
    .sort((a, b) => a.section.localeCompare(b.section) || a.shift.localeCompare(b.shift));
  return (
    sameGrade.find((c) => c.section === current.section && c.shift === current.shift) ??
    sameGrade.find((c) => c.section === current.section) ??
    sameGrade.find((c) => c.shift === current.shift) ??
    sameGrade[0] ??
    null
  );
}

export type RolloverFlag =
  | 'ALREADY_ENROLLED' // Ya tiene matrícula en el año destino
  | 'GRADUATES' // Egresa (5° de secundaria)
  | 'DECLINED' // La familia respondió que no continúa
  | 'CONFIRMED' // La familia ratificó la matrícula
  | 'NO_RATIFICATION' // Sin respuesta de ratificación
  | 'NO_FINAL_SITUATION' // El año de origen aún no tiene situación final registrada
  | 'RECOVERY' // Va a recuperación
  | 'REPEATS' // Permanece en el grado
  | 'DEBT' // Tiene deuda vencida
  | 'NO_TARGET_CLASSROOM'; // No hay aula del grado destino

/** Marcas de un candidato y si se selecciona por defecto. */
export function rolloverFlags(input: {
  alreadyEnrolled: boolean;
  step: GradeStep;
  ratification: 'CONFIRMED' | 'DECLINED' | null;
  finalSituation: string | null;
  overdueDebt: number;
  hasTargetClassroom: boolean;
}): { flags: RolloverFlag[]; selectable: boolean; selectedByDefault: boolean } {
  const flags: RolloverFlag[] = [];
  if (input.alreadyEnrolled) flags.push('ALREADY_ENROLLED');
  if (input.step.kind === 'GRADUATE') flags.push('GRADUATES');
  if (input.ratification === 'DECLINED') flags.push('DECLINED');
  else if (input.ratification === 'CONFIRMED') flags.push('CONFIRMED');
  else flags.push('NO_RATIFICATION');
  if (!input.finalSituation) flags.push('NO_FINAL_SITUATION');
  else if (input.finalSituation === 'RECOVERY') flags.push('RECOVERY');
  if (input.step.kind === 'REPEAT') flags.push('REPEATS');
  if (input.overdueDebt > 0) flags.push('DEBT');
  if (input.step.kind !== 'GRADUATE' && !input.hasTargetClassroom) flags.push('NO_TARGET_CLASSROOM');

  const selectable = !input.alreadyEnrolled && input.step.kind !== 'GRADUATE';
  // La deuda no bloquea: se avisa y decide Dirección. Quien no continúa o no tiene aula queda sin marcar.
  const selectedByDefault = selectable && input.ratification !== 'DECLINED' && input.hasTargetClassroom;
  return { flags, selectable, selectedByDefault };
}

/** Año destino por defecto: el que tiene la matrícula abierta; si no, el siguiente al vigente. */
export function defaultTargetYear<T extends { id: string; year: number; isActive: boolean; enrollmentOpen: boolean }>(years: T[]): T | null {
  const open = years.find((y) => y.enrollmentOpen);
  if (open) return open;
  const active = years.find((y) => y.isActive);
  if (!active) return null;
  return years.filter((y) => y.year > active.year).sort((a, b) => a.year - b.year)[0] ?? null;
}
