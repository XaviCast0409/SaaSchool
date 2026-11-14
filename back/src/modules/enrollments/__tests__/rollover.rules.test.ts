import { describe, expect, it } from 'vitest';
import { defaultTargetYear, nextGrade, pickTargetClassroom, rolloverFlags } from '../rollover.rules';

describe('grado del año siguiente', () => {
  it('promueve al grado siguiente del mismo nivel', () => {
    expect(nextGrade('PRIMARY', 3, 'PROMOTED')).toEqual({ kind: 'PROMOTE', level: 'PRIMARY', grade: 4 });
    expect(nextGrade('INITIAL', 4, null)).toEqual({ kind: 'PROMOTE', level: 'INITIAL', grade: 5 });
  });

  it('cambia de nivel al terminar Inicial y Primaria; 5° de secundaria egresa', () => {
    expect(nextGrade('INITIAL', 5, null)).toEqual({ kind: 'PROMOTE', level: 'PRIMARY', grade: 1 });
    expect(nextGrade('PRIMARY', 6, 'PROMOTED')).toEqual({ kind: 'PROMOTE', level: 'SECONDARY', grade: 1 });
    expect(nextGrade('SECONDARY', 5, 'PROMOTED')).toEqual({ kind: 'GRADUATE' });
  });

  it('si permanece en el grado, repite el mismo grado', () => {
    expect(nextGrade('SECONDARY', 5, 'RETAINED')).toEqual({ kind: 'REPEAT', level: 'SECONDARY', grade: 5 });
    expect(nextGrade('PRIMARY', 2, 'RETAINED')).toEqual({ kind: 'REPEAT', level: 'PRIMARY', grade: 2 });
  });
});

describe('aula destino', () => {
  const rooms = [
    { id: 'p4b-t', educationLevel: 'PRIMARY', grade: 4, section: 'B', shift: 'AFTERNOON' },
    { id: 'p4a-m', educationLevel: 'PRIMARY', grade: 4, section: 'A', shift: 'MORNING' },
    { id: 'p4b-m', educationLevel: 'PRIMARY', grade: 4, section: 'B', shift: 'MORNING' },
    { id: 's1a-m', educationLevel: 'SECONDARY', grade: 1, section: 'A', shift: 'MORNING' },
  ];
  it('prefiere misma sección y turno, luego misma sección, luego mismo turno', () => {
    expect(pickTargetClassroom(rooms, { level: 'PRIMARY', grade: 4 }, { section: 'B', shift: 'MORNING' })?.id).toBe('p4b-m');
    expect(pickTargetClassroom(rooms, { level: 'PRIMARY', grade: 4 }, { section: 'B', shift: 'NIGHT' })?.id).toBe('p4b-t');
    expect(pickTargetClassroom(rooms, { level: 'PRIMARY', grade: 4 }, { section: 'C', shift: 'AFTERNOON' })?.id).toBe('p4b-t');
    expect(pickTargetClassroom(rooms, { level: 'PRIMARY', grade: 4 }, { section: 'C', shift: 'NIGHT' })?.id).toBe('p4a-m');
  });
  it('null si no hay aulas del grado destino', () => {
    expect(pickTargetClassroom(rooms, { level: 'PRIMARY', grade: 5 }, { section: 'A', shift: 'MORNING' })).toBeNull();
  });
});

describe('marcas del candidato', () => {
  const base = {
    alreadyEnrolled: false,
    step: { kind: 'PROMOTE' as const, level: 'PRIMARY' as const, grade: 4 },
    ratification: 'CONFIRMED' as const,
    finalSituation: 'PROMOTED',
    overdueDebt: 0,
    hasTargetClassroom: true,
  };
  it('ratificado y con aula: seleccionado', () => {
    expect(rolloverFlags(base)).toEqual({ flags: ['CONFIRMED'], selectable: true, selectedByDefault: true });
  });
  it('la deuda avisa pero no bloquea', () => {
    const r = rolloverFlags({ ...base, overdueDebt: 450 });
    expect(r.flags).toContain('DEBT');
    expect(r.selectedByDefault).toBe(true);
  });
  it('si la familia no continúa, queda sin marcar', () => {
    const r = rolloverFlags({ ...base, ratification: 'DECLINED' });
    expect(r).toMatchObject({ selectable: true, selectedByDefault: false });
  });
  it('ya matriculado o egresado: no seleccionable', () => {
    expect(rolloverFlags({ ...base, alreadyEnrolled: true }).selectable).toBe(false);
    const g = rolloverFlags({ ...base, step: { kind: 'GRADUATE' } });
    expect(g).toMatchObject({ selectable: false });
    expect(g.flags).toContain('GRADUATES');
    expect(g.flags).not.toContain('NO_TARGET_CLASSROOM');
  });
  it('sin aula destino o sin situación final', () => {
    const r = rolloverFlags({ ...base, hasTargetClassroom: false, finalSituation: null, ratification: null });
    expect(r.flags).toEqual(expect.arrayContaining(['NO_TARGET_CLASSROOM', 'NO_FINAL_SITUATION', 'NO_RATIFICATION']));
    expect(r.selectedByDefault).toBe(false);
  });
});

describe('año destino por defecto', () => {
  const y = (id: string, year: number, isActive = false, enrollmentOpen = false) => ({ id, year, isActive, enrollmentOpen });
  it('usa el año con matrícula abierta', () => {
    expect(defaultTargetYear([y('a', 2026, true), y('b', 2027), y('c', 2028, false, true)])?.id).toBe('c');
  });
  it('si no, el siguiente al vigente', () => {
    expect(defaultTargetYear([y('c', 2028), y('a', 2026, true), y('b', 2027)])?.id).toBe('b');
    expect(defaultTargetYear([y('a', 2026, true)])).toBeNull();
  });
});
