import { describe, it, expect } from 'vitest';
import { validateResponse, summarizeByStudent, isPastDeadline } from '../announcement-response.rules';

describe('respuestas a comunicados', () => {
  it('valida según el tipo', () => {
    expect(validateResponse('NONE', 'ACK', [])).not.toBeNull();
    expect(validateResponse('ACKNOWLEDGE', 'ACK', [])).toBeNull();
    expect(validateResponse('AUTHORIZATION', 'AUTHORIZED', [])).toBeNull();
    expect(validateResponse('AUTHORIZATION', 'ACK', [])).not.toBeNull();
    expect(validateResponse('POLL', 'Sí', ['Sí', 'No'])).toBeNull();
    expect(validateResponse('POLL', 'Tal vez', ['Sí', 'No'])).not.toBeNull();
  });
  it('un alumno cuenta como respondido si cualquiera de sus apoderados responde; vale la última', () => {
    const expected = [
      { userId: 'mama', studentId: 'ana' },
      { userId: 'papa', studentId: 'ana' },
      { userId: 'tia', studentId: 'luis' },
    ];
    const s = summarizeByStudent(expected, [
      { userId: 'mama', studentId: 'ana', response: 'NOT_AUTHORIZED', respondedAt: new Date('2026-11-10T10:00:00Z') },
      { userId: 'papa', studentId: 'ana', response: 'AUTHORIZED', respondedAt: new Date('2026-11-10T11:00:00Z') },
      { userId: 'otro', studentId: 'ajeno', response: 'AUTHORIZED', respondedAt: new Date('2026-11-10T11:00:00Z') },
    ]);
    expect(s.expectedStudents).toBe(2);
    expect(s.respondedStudents).toBe(1);
    expect(s.tally).toEqual({ AUTHORIZED: 1 });
  });
  it('plazo vencido', () => {
    expect(isPastDeadline(null)).toBe(false);
    expect(isPastDeadline(new Date('2026-11-10T00:00:00Z'), new Date('2026-11-11T00:00:00Z'))).toBe(true);
  });
});
