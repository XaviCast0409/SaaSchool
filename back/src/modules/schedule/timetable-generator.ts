/**
 * Generador automático de horarios (sin dependencias ni APIs externas).
 *
 * Reglas obligatorias:
 *  - Un docente nunca está en dos aulas a la vez (incluye los horarios ya guardados de otras aulas).
 *  - Se respetan las horas en que el docente no está disponible.
 *  - Un bloque doble nunca queda partido por un recreo.
 *  - Un curso no supera su máximo de horas por día (2 por defecto).
 *
 * Preferencias (se cumplen en lo posible):
 *  - Agrupar en bloques dobles: 3 h = 2 + 1, 5 h = 2 + 2 + 1, en días distintos.
 *  - Separar los días del mismo curso (lunes y jueves mejor que lunes y martes).
 *  - Repartir la carga del aula y del docente a lo largo de la semana.
 *  - Primeras horas para los cursos marcados así.
 *
 * Método: varias pasadas "voraces" (primero lo más difícil de ubicar) con orden aleatorio
 * reproducible (semilla) y se queda con la mejor. Si un bloque doble no entra, se intenta como dos
 * horas sueltas. Lo que no se pueda ubicar se informa con su motivo.
 */

export interface TemplateSlot {
  start: string;
  end: string;
  kind: 'CLASS' | 'BREAK';
  label?: string;
}

export interface GenCourse {
  assignmentId: string;
  teacherId: string;
  name: string;
  hours: number;
  preferDouble: boolean;
  maxPerDay: number;
  preferEarly: boolean;
}

export interface GenClassroom {
  id: string;
  label: string;
  days: number[];
  slots: TemplateSlot[];
  courses: GenCourse[];
}

export interface Interval {
  day: number;
  start: string;
  end: string;
}

export interface GenInput {
  classrooms: GenClassroom[];
  /** Horas ocupadas o no disponibles de cada docente fuera de las aulas que se generan. */
  teacherBusy: Record<string, Interval[]>;
  attempts?: number;
  seed?: number;
}

export interface Placement {
  classroomId: string;
  assignmentId: string;
  day: number;
  slotIndexes: number[];
}

export interface Unplaced {
  classroomId: string;
  classroomLabel: string;
  assignmentId: string;
  courseName: string;
  missingHours: number;
  reason: string;
}

export interface GenResult {
  placements: Placement[];
  unplaced: Unplaced[];
  warnings: string[];
  penalty: number;
}

// ------------------------------------------------------------------ utilidades puras

/** Divide las horas semanales en bloques: dobles cuando se prefiere, y el resto en horas sueltas. */
export function splitHours(hours: number, preferDouble: boolean, maxPerDay: number): number[] {
  if (hours <= 0) return [];
  if (!preferDouble || maxPerDay < 2) return Array(hours).fill(1);
  return [...Array(Math.floor(hours / 2)).fill(2), ...(hours % 2 ? [1] : [])];
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.day === b.day && a.start < b.end && b.start < a.end;
}

/** Inicios posibles de un bloque de `size` horas seguidas sin recreo de por medio. */
export function contiguousStarts(slots: TemplateSlot[], size: number): number[] {
  const starts: number[] = [];
  for (let i = 0; i + size <= slots.length; i++) {
    let ok = true;
    for (let j = i; j < i + size; j++) {
      if (slots[j].kind !== 'CLASS') ok = false;
      if (j > i && slots[j - 1].end !== slots[j].start) ok = false;
    }
    if (ok) starts.push(i);
  }
  return starts;
}

/** Generador pseudoaleatorio con semilla (mulberry32) para resultados reproducibles. */
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const classSlotCount = (c: GenClassroom) => c.slots.filter((s) => s.kind === 'CLASS').length * c.days.length;

/** Avisos previos: horas que no caben en la jornada del aula o en la del docente. */
export function precheck(input: GenInput): string[] {
  const warnings: string[] = [];
  const teacherHours = new Map<string, { name: string; hours: number }>();
  for (const c of input.classrooms) {
    const total = c.courses.reduce((s, x) => s + x.hours, 0);
    const capacity = classSlotCount(c);
    if (total > capacity) warnings.push(`${c.label}: el plan suma ${total} h, pero la jornada solo tiene ${capacity} horas de clase a la semana.`);
    for (const course of c.courses) {
      const maxWeek = Math.max(1, course.maxPerDay) * c.days.length;
      if (course.hours > maxWeek) warnings.push(`${c.label} · ${course.name}: ${course.hours} h no caben con un máximo de ${course.maxPerDay} h por día.`);
      const t = teacherHours.get(course.teacherId) ?? { name: course.name, hours: 0 };
      t.hours += course.hours;
      teacherHours.set(course.teacherId, t);
    }
  }
  return warnings;
}

// ------------------------------------------------------------------ generador

interface Task {
  classroom: GenClassroom;
  course: GenCourse;
  size: number;
}

interface State {
  /** classroomId → "día:índice" ocupados */
  grid: Map<string, Set<string>>;
  /** teacherId → intervalos ocupados */
  teacher: Map<string, Interval[]>;
  /** "aula|curso" → horas por día */
  courseDays: Map<string, Map<number, number>>;
  /** "aula" → horas por día (para equilibrar) */
  classroomLoad: Map<string, Map<number, number>>;
  placements: Placement[];
  penalty: number;
}

function newState(input: GenInput): State {
  const teacher = new Map<string, Interval[]>();
  for (const [id, list] of Object.entries(input.teacherBusy)) teacher.set(id, [...list]);
  return { grid: new Map(), teacher, courseDays: new Map(), classroomLoad: new Map(), placements: [], penalty: 0 };
}

type Blocker = 'CLASSROOM' | 'TEACHER' | 'DAY_LIMIT';

function candidates(task: Task, st: State, rand: () => number, jitter: number) {
  const { classroom: c, course, size } = task;
  const grid = st.grid.get(c.id) ?? new Set<string>();
  const busy = st.teacher.get(course.teacherId) ?? [];
  const perDay = st.courseDays.get(`${c.id}|${course.assignmentId}`) ?? new Map<number, number>();
  const load = st.classroomLoad.get(c.id) ?? new Map<number, number>();
  const starts = contiguousStarts(c.slots, size);
  const out: Array<{ day: number; idx: number[]; score: number }> = [];
  const blockers = new Set<Blocker>();

  for (const day of c.days) {
    const usedToday = perDay.get(day) ?? 0;
    for (const s of starts) {
      const idx = Array.from({ length: size }, (_, k) => s + k);
      if (idx.some((i) => grid.has(`${day}:${i}`))) {
        blockers.add('CLASSROOM');
        continue;
      }
      if (usedToday + size > course.maxPerDay) {
        blockers.add('DAY_LIMIT');
        continue;
      }
      const interval = { day, start: c.slots[idx[0]].start, end: c.slots[idx[idx.length - 1]].end };
      if (busy.some((b) => overlaps(b, interval))) {
        blockers.add('TEACHER');
        continue;
      }
      let score = 0;
      if (usedToday > 0) score += 60; // mismo curso dos veces el mismo día
      if ((perDay.get(day - 1) ?? 0) > 0 || (perDay.get(day + 1) ?? 0) > 0) score += 8; // días seguidos
      score += course.preferEarly ? s * 3 : s * 0.15;
      score += (load.get(day) ?? 0) * 0.6; // equilibrar el aula
      score += busy.filter((b) => b.day === day).length * 0.4; // equilibrar al docente
      score += rand() * jitter;
      out.push({ day, idx, score });
    }
  }
  out.sort((a, b) => a.score - b.score);
  return { list: out, blockers };
}

function place(task: Task, st: State, cand: { day: number; idx: number[]; score: number }) {
  const { classroom: c, course } = task;
  if (!st.grid.has(c.id)) st.grid.set(c.id, new Set());
  for (const i of cand.idx) st.grid.get(c.id)!.add(`${cand.day}:${i}`);
  const interval = { day: cand.day, start: c.slots[cand.idx[0]].start, end: c.slots[cand.idx[cand.idx.length - 1]].end };
  st.teacher.set(course.teacherId, [...(st.teacher.get(course.teacherId) ?? []), interval]);
  const key = `${c.id}|${course.assignmentId}`;
  if (!st.courseDays.has(key)) st.courseDays.set(key, new Map());
  const pd = st.courseDays.get(key)!;
  pd.set(cand.day, (pd.get(cand.day) ?? 0) + cand.idx.length);
  if (!st.classroomLoad.has(c.id)) st.classroomLoad.set(c.id, new Map());
  const ld = st.classroomLoad.get(c.id)!;
  ld.set(cand.day, (ld.get(cand.day) ?? 0) + cand.idx.length);
  st.placements.push({ classroomId: c.id, assignmentId: course.assignmentId, day: cand.day, slotIndexes: cand.idx });
  st.penalty += cand.score;
}

const REASON: Record<Blocker | 'NONE', string> = {
  CLASSROOM: 'El aula ya no tiene horas libres en la jornada.',
  TEACHER: 'El docente no tiene horas libres que coincidan con las del aula (otras aulas o no disponible).',
  DAY_LIMIT: 'No queda un día libre sin superar el máximo de horas diarias del curso.',
  NONE: 'La jornada no tiene horas suficientes.',
};

function runAttempt(input: GenInput, seed: number, shuffle: boolean): GenResult {
  const rand = rng(seed);
  const st = newState(input);
  const teacherLoad = new Map<string, number>();
  for (const c of input.classrooms) for (const x of c.courses) teacherLoad.set(x.teacherId, (teacherLoad.get(x.teacherId) ?? 0) + x.hours);

  const tasks: Task[] = [];
  for (const c of input.classrooms) {
    for (const course of c.courses) for (const size of splitHours(course.hours, course.preferDouble, course.maxPerDay)) tasks.push({ classroom: c, course, size });
  }
  // Primero lo más difícil: bloques dobles, docentes con más carga (y ocupados en otras aulas), cursos con más horas
  const difficulty = (t: Task) =>
    t.size * 1000 + (teacherLoad.get(t.course.teacherId) ?? 0) * 10 + (input.teacherBusy[t.course.teacherId]?.length ?? 0) * 5 + t.course.hours + (shuffle ? rand() * 25 : 0);
  tasks.sort((a, b) => difficulty(b) - difficulty(a));

  const missing = new Map<string, { task: Task; hours: number; blockers: Set<Blocker> }>();
  const queue = [...tasks];
  while (queue.length) {
    const task = queue.shift()!;
    const { list, blockers } = candidates(task, st, rand, shuffle ? 2 : 0);
    if (list.length) {
      place(task, st, list[0]);
      continue;
    }
    if (task.size > 1) {
      // Plan B: el bloque doble como horas sueltas
      st.penalty += 15;
      for (let k = 0; k < task.size; k++) queue.unshift({ ...task, size: 1 });
      continue;
    }
    const key = `${task.classroom.id}|${task.course.assignmentId}`;
    const m = missing.get(key) ?? { task, hours: 0, blockers: new Set<Blocker>() };
    m.hours += task.size;
    blockers.forEach((b) => m.blockers.add(b));
    missing.set(key, m);
  }

  const unplaced: Unplaced[] = [...missing.values()].map(({ task, hours, blockers }) => {
    const main: Blocker | 'NONE' = blockers.has('TEACHER') ? 'TEACHER' : blockers.has('DAY_LIMIT') ? 'DAY_LIMIT' : blockers.has('CLASSROOM') ? 'CLASSROOM' : 'NONE';
    return {
      classroomId: task.classroom.id,
      classroomLabel: task.classroom.label,
      assignmentId: task.course.assignmentId,
      courseName: task.course.name,
      missingHours: hours,
      reason: REASON[main],
    };
  });
  return { placements: st.placements, unplaced, warnings: [], penalty: st.penalty };
}

/** Genera la mejor propuesta entre varias pasadas. Resultado reproducible para la misma semilla. */
export function generateTimetable(input: GenInput): GenResult {
  const attempts = Math.max(1, input.attempts ?? 40);
  const seed = input.seed ?? 20261115;
  let best: GenResult | null = null;
  const missingOf = (r: GenResult) => r.unplaced.reduce((s, u) => s + u.missingHours, 0);
  for (let a = 0; a < attempts; a++) {
    const r = runAttempt(input, seed + a * 7919, a > 0);
    if (!best || missingOf(r) < missingOf(best) || (missingOf(r) === missingOf(best) && r.penalty < best.penalty)) best = r;
    if (missingOf(best) === 0 && a >= 9) break; // ya completo: unas pocas pasadas más solo para pulir
  }
  return { ...best!, warnings: precheck(input) };
}
