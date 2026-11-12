import { describe, it, expect } from 'vitest';
import { contiguousStarts, generateTimetable, splitHours, type GenClassroom, type TemplateSlot } from '../timetable-generator';

/** Jornada típica de primaria: 6 horas de 45 min con un recreo después de la 2.ª y otro después de la 4.ª. */
const SLOTS: TemplateSlot[] = [
  { start: '08:00', end: '08:45', kind: 'CLASS' },
  { start: '08:45', end: '09:30', kind: 'CLASS' },
  { start: '09:30', end: '09:50', kind: 'BREAK', label: 'Recreo' },
  { start: '09:50', end: '10:35', kind: 'CLASS' },
  { start: '10:35', end: '11:20', kind: 'CLASS' },
  { start: '11:20', end: '11:40', kind: 'BREAK', label: 'Recreo' },
  { start: '11:40', end: '12:25', kind: 'CLASS' },
  { start: '12:25', end: '13:10', kind: 'CLASS' },
];
const DAYS = [1, 2, 3, 4, 5];

const course = (assignmentId: string, teacherId: string, hours: number, extra: Partial<{ preferDouble: boolean; maxPerDay: number; preferEarly: boolean }> = {}) => ({
  assignmentId,
  teacherId,
  name: assignmentId,
  hours,
  preferDouble: extra.preferDouble ?? true,
  maxPerDay: extra.maxPerDay ?? 2,
  preferEarly: extra.preferEarly ?? false,
});

const classroom = (id: string, courses: ReturnType<typeof course>[]): GenClassroom => ({ id, label: id, days: DAYS, slots: SLOTS, courses });

const toTime = (c: GenClassroom, p: { day: number; slotIndexes: number[] }) => ({
  day: p.day,
  start: c.slots[p.slotIndexes[0]].start,
  end: c.slots[p.slotIndexes[p.slotIndexes.length - 1]].end,
});

describe('reparto de horas', () => {
  it('3 h = 2 + 1; 5 h = 2 + 2 + 1; sin dobles = horas sueltas', () => {
    expect(splitHours(3, true, 2)).toEqual([2, 1]);
    expect(splitHours(5, true, 2)).toEqual([2, 2, 1]);
    expect(splitHours(4, true, 2)).toEqual([2, 2]);
    expect(splitHours(3, false, 2)).toEqual([1, 1, 1]);
    expect(splitHours(3, true, 1)).toEqual([1, 1, 1]);
  });

  it('un bloque doble nunca queda partido por el recreo', () => {
    expect(contiguousStarts(SLOTS, 2)).toEqual([0, 3, 6]);
    expect(contiguousStarts(SLOTS, 1)).toEqual([0, 1, 3, 4, 6, 7]);
  });
});

describe('generador de horarios', () => {
  it('un curso de 3 horas queda como bloque doble un día y hora suelta otro día, separados', () => {
    const c = classroom('1A', [course('mat', 'ana', 3)]);
    const r = generateTimetable({ classrooms: [c], teacherBusy: {} });
    expect(r.unplaced).toEqual([]);
    const sizes = r.placements.map((p) => p.slotIndexes.length).sort();
    expect(sizes).toEqual([1, 2]);
    const days = r.placements.map((p) => p.day);
    expect(new Set(days).size).toBe(2);
    expect(Math.abs(days[0] - days[1])).toBeGreaterThan(1); // no en días seguidos
  });

  it('llena un aula completa sin cruces internos ni recreos ocupados', () => {
    const c = classroom('1A', [
      course('mat', 'ana', 6),
      course('com', 'ana', 6),
      course('cyt', 'ana', 4),
      course('ps', 'ana', 4),
      course('ef', 'luis', 3),
      course('ing', 'sofia', 3),
      course('arte', 'ana', 2),
      course('rel', 'elena', 2),
    ]);
    const r = generateTimetable({ classrooms: [c], teacherBusy: {} });
    expect(r.unplaced).toEqual([]);
    const cells = r.placements.flatMap((p) => p.slotIndexes.map((i) => `${p.day}:${i}`));
    expect(new Set(cells).size).toBe(cells.length); // sin cruces
    expect(cells.length).toBe(30);
    expect(cells.some((k) => k.endsWith(':2') || k.endsWith(':5'))).toBe(false); // recreos libres
    // ningún curso supera 2 horas por día
    const perDay = new Map<string, number>();
    for (const p of r.placements) perDay.set(`${p.assignmentId}:${p.day}`, (perDay.get(`${p.assignmentId}:${p.day}`) ?? 0) + p.slotIndexes.length);
    expect(Math.max(...perDay.values())).toBeLessThanOrEqual(2);
  });

  it('el mismo docente nunca queda en dos aulas a la vez', () => {
    const a = classroom('1A', [course('ef-1a', 'luis', 3), course('mat-1a', 'ana', 5), course('com-1a', 'ana', 5)]);
    const b = classroom('2A', [course('ef-2a', 'luis', 3), course('mat-2a', 'rosa', 5), course('com-2a', 'rosa', 5)]);
    const c = classroom('3A', [course('ef-3a', 'luis', 3), course('mat-3a', 'jorge', 5)]);
    const r = generateTimetable({ classrooms: [a, b, c], teacherBusy: {} });
    expect(r.unplaced).toEqual([]);
    const byId = new Map([a, b, c].map((x) => [x.id, x]));
    const luis = r.placements.filter((p) => p.assignmentId.startsWith('ef')).map((p) => toTime(byId.get(p.classroomId)!, p));
    for (let i = 0; i < luis.length; i++) {
      for (let j = i + 1; j < luis.length; j++) {
        const x = luis[i];
        const y = luis[j];
        expect(x.day === y.day && x.start < y.end && y.start < x.end).toBe(false);
      }
    }
  });

  it('respeta las horas no disponibles y los horarios ya guardados de otras aulas', () => {
    const c = classroom('1A', [course('ing', 'sofia', 3)]);
    const busy = { sofia: [1, 2, 3, 5].map((day) => ({ day, start: '07:00', end: '14:00' })) }; // solo puede los jueves
    const r = generateTimetable({ classrooms: [c], teacherBusy: busy });
    expect(r.placements.every((p) => p.day === 4)).toBe(true);
    expect(r.placements.reduce((s, p) => s + p.slotIndexes.length, 0)).toBe(2); // máximo 2 h por día
    expect(r.unplaced).toHaveLength(1);
    expect(r.unplaced[0].missingHours).toBe(1);
    expect(r.unplaced[0].reason).toMatch(/docente|día/);
  });

  it('avisa cuando el plan no cabe en la jornada', () => {
    const c = classroom('1A', [course('mat', 'ana', 20), course('com', 'rosa', 20)]);
    const r = generateTimetable({ classrooms: [c], teacherBusy: {}, attempts: 3 });
    expect(r.warnings.join(' ')).toMatch(/solo tiene 30 horas/);
    expect(r.unplaced.length).toBeGreaterThan(0);
  });

  it('es reproducible con la misma semilla', () => {
    const c = classroom('1A', [course('mat', 'ana', 5), course('com', 'ana', 5), course('ef', 'luis', 3)]);
    const a = generateTimetable({ classrooms: [c], teacherBusy: {}, seed: 7 });
    const b = generateTimetable({ classrooms: [c], teacherBusy: {}, seed: 7 });
    expect(a.placements).toEqual(b.placements);
  });

  it('las primeras horas para los cursos que lo prefieren', () => {
    const c = classroom('1A', [course('mat', 'ana', 4, { preferEarly: true }), course('arte', 'rosa', 4)]);
    const r = generateTimetable({ classrooms: [c], teacherBusy: {} });
    const mat = r.placements.filter((p) => p.assignmentId === 'mat');
    expect(mat.every((p) => p.slotIndexes[0] === 0)).toBe(true);
  });

  it('colegio realista: 8 aulas con especialistas compartidos, sin cruces y en poco tiempo', () => {
    const rooms = Array.from({ length: 8 }, (_, i) => {
      const id = `aula${i + 1}`;
      return classroom(id, [
        course(`${id}-mat`, `tutor${i}`, 6),
        course(`${id}-com`, `tutor${i}`, 6),
        course(`${id}-cyt`, `tutor${i}`, 3),
        course(`${id}-ps`, `tutor${i}`, 3),
        course(`${id}-ef`, 'luis', 3),
        course(`${id}-ing`, 'sofia', 3),
        course(`${id}-rel`, 'elena', 2),
        course(`${id}-arte`, `tutor${i}`, 2),
      ]);
    });
    const t0 = Date.now();
    const r = generateTimetable({ classrooms: rooms, teacherBusy: {} });
    expect(Date.now() - t0).toBeLessThan(5000);
    const byId = new Map(rooms.map((x) => [x.id, x]));
    const teacherOf = new Map(rooms.flatMap((x) => x.courses.map((c) => [c.assignmentId, c.teacherId] as const)));
    const intervals = r.placements.map((p) => ({ t: teacherOf.get(p.assignmentId)!, ...toTime(byId.get(p.classroomId)!, p) }));
    for (let i = 0; i < intervals.length; i++) {
      for (let j = i + 1; j < intervals.length; j++) {
        const x = intervals[i];
        const y = intervals[j];
        if (x.t === y.t) expect(x.day === y.day && x.start < y.end && y.start < x.end).toBe(false);
      }
    }
    const placed = r.placements.reduce((s, p) => s + p.slotIndexes.length, 0);
    const missing = r.unplaced.reduce((s, u) => s + u.missingHours, 0);
    expect(placed + missing).toBe(8 * 28);
    expect(missing).toBeLessThanOrEqual(2);
  });
});
