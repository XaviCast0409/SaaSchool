/**
 * Reglas puras del horario semanal (sin base de datos), para poder probarlas.
 * Las horas son 'HH:mm' en hora de Lima, por lo que se comparan como texto.
 */

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export interface BlockLike {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface TeacherBlock extends BlockLike {
  teacherId: string | null;
  classroomLabel?: string;
  courseName?: string;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTime(t: string): boolean {
  return TIME.test(t);
}

/** ¿Se cruzan dos bloques del mismo día? Bloques contiguos (uno termina cuando empieza el otro) no se cruzan. */
export function blocksOverlap(a: BlockLike, b: BlockLike): boolean {
  return a.dayOfWeek === b.dayOfWeek && a.startTime < b.endTime && b.startTime < a.endTime;
}

/** Errores de un horario de aula: horas inválidas, fin antes de inicio o bloques que se cruzan. */
export function validateClassroomBlocks(blocks: BlockLike[]): string[] {
  const errors: string[] = [];
  blocks.forEach((b, i) => {
    if (b.dayOfWeek < 1 || b.dayOfWeek > 6) errors.push(`Bloque ${i + 1}: día no válido.`);
    if (!isValidTime(b.startTime) || !isValidTime(b.endTime)) errors.push(`Bloque ${i + 1}: hora no válida.`);
    else if (b.startTime >= b.endTime) errors.push(`Bloque ${i + 1}: la hora de fin debe ser posterior a la de inicio.`);
  });
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      if (blocksOverlap(blocks[i], blocks[j])) {
        const b = blocks[i];
        errors.push(`${DAY_NAMES[b.dayOfWeek]}: el bloque de ${blocks[i].startTime}–${blocks[i].endTime} se cruza con el de ${blocks[j].startTime}–${blocks[j].endTime}.`);
      }
    }
  }
  return errors;
}

/**
 * Choques de docentes: el mismo docente en dos aulas a la misma hora.
 * `proposed` son los bloques nuevos del aula; `others` los bloques vigentes de las demás aulas.
 */
export function findTeacherConflicts(proposed: TeacherBlock[], others: TeacherBlock[]): string[] {
  const conflicts: string[] = [];
  for (const p of proposed) {
    if (!p.teacherId) continue;
    for (const o of others) {
      if (o.teacherId === p.teacherId && blocksOverlap(p, o)) {
        conflicts.push(
          `${DAY_NAMES[p.dayOfWeek]} ${p.startTime}–${p.endTime}: el docente de ${p.courseName ?? 'este curso'} ya dicta ${o.courseName ?? 'otro curso'} en ${o.classroomLabel ?? 'otra aula'} (${o.startTime}–${o.endTime}).`,
        );
      }
    }
  }
  return [...new Set(conflicts)];
}

/** Minutos semanales por curso (para comparar con las horas del plan de estudios). */
export function weeklyMinutesByCourse(blocks: Array<BlockLike & { courseAssignmentId: string | null }>): Map<string, number> {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const map = new Map<string, number>();
  for (const b of blocks) {
    if (!b.courseAssignmentId) continue;
    map.set(b.courseAssignmentId, (map.get(b.courseAssignmentId) ?? 0) + (toMin(b.endTime) - toMin(b.startTime)));
  }
  return map;
}

/** Día de la semana (0–6) de una fecha 'YYYY-MM-DD'. */
export function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00.000Z`).getUTCDay();
}

export function sortBlocks<T extends BlockLike>(blocks: T[]): T[] {
  return [...blocks].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
}
