import { describe, it, expect } from 'vitest';
import { attendanceLight, computeBadges, gradesLight, homeworkLight, paymentsLight } from '../family.rules';

const P = 'PRESENT';
const A = 'ABSENT_UNJUSTIFIED';

describe('semáforo por hijo', () => {
  it('asistencia: las faltas justificadas no penalizan', () => {
    expect(attendanceLight([]).light).toBe('GRAY');
    expect(attendanceLight(Array(20).fill(P)).light).toBe('GREEN');
    expect(attendanceLight([...Array(18).fill(P), 'ABSENT_JUSTIFIED', 'ABSENT_JUSTIFIED']).light).toBe('GREEN');
    expect(attendanceLight([...Array(18).fill(P), A, A]).light).toBe('YELLOW');
    expect(attendanceLight([...Array(15).fill(P), A, A, A, A, A]).light).toBe('RED');
  });

  it('notas: solo con un periodo publicado', () => {
    expect(gradesLight(['A', 'C'], null).light).toBe('GRAY');
    expect(gradesLight(['AD', 'A'], '2.° bimestre').light).toBe('GREEN');
    expect(gradesLight(['A', 'B', 'B'], '2.° bimestre').detail).toMatch(/2 competencias en B/);
    expect(gradesLight(['A', 'C'], '2.° bimestre').light).toBe('RED');
  });

  it('tareas y pagos', () => {
    expect(homeworkLight(0, 2).detail).toMatch(/2 por entregar/);
    expect(homeworkLight(2, 0).light).toBe('YELLOW');
    expect(homeworkLight(3, 0).light).toBe('RED');
    expect(paymentsLight(0, 0).light).toBe('GREEN');
    expect(paymentsLight(0, 350).light).toBe('YELLOW');
    expect(paymentsLight(420, 0).detail).toBe('S/ 420.00 vencido');
  });
});

describe('insignias', () => {
  const base = { homeworkDue30: 0, homeworkOnTime30: 0 };
  it('puntualidad y mes sin faltas requieren al menos 8 días de registro', () => {
    const b = computeBadges({ ...base, monthStatuses: Array(10).fill(P), recentStatuses: Array(10).fill(P) });
    expect(b.find((x) => x.id === 'punctual')!.earned).toBe(true);
    expect(b.find((x) => x.id === 'attendance')!.earned).toBe(true);
    const few = computeBadges({ ...base, monthStatuses: Array(3).fill(P), recentStatuses: [] });
    expect(few.find((x) => x.id === 'punctual')!.earned).toBe(false);
  });

  it('la racha cuenta días seguidos desde el más reciente y se corta con una falta', () => {
    const b = computeBadges({ ...base, monthStatuses: [], recentStatuses: [...Array(5).fill(P), A, ...Array(11).fill(P)] });
    const streak = b.find((x) => x.id === 'streak')!;
    expect(streak.earned).toBe(true);
    expect(streak.progress).toBe('11 días seguidos');
  });

  it('tareas al día exige mínimo 3 y todas a tiempo', () => {
    expect(computeBadges({ ...base, monthStatuses: [], recentStatuses: [], homeworkDue30: 3, homeworkOnTime30: 3 }).find((x) => x.id === 'homework')!.earned).toBe(true);
    expect(computeBadges({ ...base, monthStatuses: [], recentStatuses: [], homeworkDue30: 4, homeworkOnTime30: 3 }).find((x) => x.id === 'homework')!.earned).toBe(false);
  });
});
