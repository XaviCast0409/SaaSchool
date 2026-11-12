import { describe, it, expect } from 'vitest';
import { blocksOverlap, validateClassroomBlocks, findTeacherConflicts, weeklyMinutesByCourse, weekdayOf, sortBlocks } from '../schedule.rules';

const b = (dayOfWeek: number, startTime: string, endTime: string) => ({ dayOfWeek, startTime, endTime });

describe('horario semanal', () => {
  it('bloques contiguos no se cruzan; superpuestos sí', () => {
    expect(blocksOverlap(b(1, '08:00', '08:45'), b(1, '08:45', '09:30'))).toBe(false);
    expect(blocksOverlap(b(1, '08:00', '09:00'), b(1, '08:45', '09:30'))).toBe(true);
    expect(blocksOverlap(b(1, '08:00', '09:00'), b(2, '08:00', '09:00'))).toBe(false);
  });

  it('valida horas, orden y cruces dentro del aula', () => {
    expect(validateClassroomBlocks([b(1, '08:00', '08:45'), b(1, '08:45', '09:30')])).toEqual([]);
    expect(validateClassroomBlocks([b(1, '09:00', '08:00')])[0]).toMatch(/posterior/);
    expect(validateClassroomBlocks([b(7, '08:00', '09:00')])[0]).toMatch(/día/);
    expect(validateClassroomBlocks([b(1, '8:00', '09:00')])[0]).toMatch(/hora/);
    expect(validateClassroomBlocks([b(1, '08:00', '09:00'), b(1, '08:30', '09:30')])[0]).toMatch(/Lunes.*se cruza/);
  });

  it('detecta al mismo docente en dos aulas a la vez', () => {
    const proposed = [{ ...b(2, '10:00', '10:45'), teacherId: 'ana', courseName: 'Matemática' }];
    const others = [
      { ...b(2, '10:30', '11:15'), teacherId: 'ana', courseName: 'Matemática', classroomLabel: '2.° B' },
      { ...b(2, '10:00', '10:45'), teacherId: 'luis', courseName: 'Arte', classroomLabel: '3.° A' },
    ];
    const conflicts = findTeacherConflicts(proposed, others);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatch(/Martes.*2\.° B/);
    expect(findTeacherConflicts([{ ...b(2, '10:00', '10:45'), teacherId: null }], others)).toEqual([]);
  });

  it('suma minutos semanales por curso', () => {
    const m = weeklyMinutesByCourse([
      { ...b(1, '08:00', '09:30'), courseAssignmentId: 'mat' },
      { ...b(3, '08:00', '08:45'), courseAssignmentId: 'mat' },
      { ...b(3, '10:00', '10:20'), courseAssignmentId: null },
    ]);
    expect(m.get('mat')).toBe(135);
    expect(m.size).toBe(1);
  });

  it('día de la semana de una fecha y orden', () => {
    expect(weekdayOf('2026-11-13')).toBe(5);
    expect(sortBlocks([b(2, '08:00', '09:00'), b(1, '10:00', '11:00'), b(1, '08:00', '09:00')]).map((x) => `${x.dayOfWeek}${x.startTime}`)).toEqual([
      '108:00',
      '110:00',
      '208:00',
    ]);
  });
});
