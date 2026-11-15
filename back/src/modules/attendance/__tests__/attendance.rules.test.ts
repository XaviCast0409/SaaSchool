import { describe, it, expect } from 'vitest';
import {
  levelsForScope,
  expandSchoolDays,
  computeRiskSignals,
  daysBetween,
  limaWeekday,
  isSchoolDay,
} from '../attendance.rules';

describe('levelsForScope', () => {
  const offered = ['INITIAL', 'PRIMARY', 'SECONDARY'] as const;
  it('horario de nivel cierra solo su nivel', () => {
    expect(levelsForScope('SECONDARY', [...offered], ['GENERAL', 'SECONDARY'])).toEqual(['SECONDARY']);
  });
  it('GENERAL cierra los niveles sin horario propio', () => {
    expect(levelsForScope('GENERAL', [...offered], ['GENERAL', 'INITIAL'])).toEqual(['PRIMARY', 'SECONDARY']);
  });
  it('nivel no ofrecido no cierra nada', () => {
    expect(levelsForScope('INITIAL', ['PRIMARY'], ['INITIAL'])).toEqual([]);
  });
});

describe('expandSchoolDays', () => {
  it('omite fines de semana y feriados', () => {
    // 2026-11-06 (vie) a 2026-11-10 (mar); 2026-11-09 feriado de prueba
    expect(expandSchoolDays('2026-11-06', '2026-11-10', new Set(['2026-11-09']))).toEqual(['2026-11-06', '2026-11-10']);
  });
  it('rango de un día', () => {
    expect(expandSchoolDays('2026-11-10', '2026-11-10', new Set())).toEqual(['2026-11-10']);
  });
  it('daysBetween', () => expect(daysBetween('2026-11-01', '2026-11-15')).toBe(14));
});

describe('computeRiskSignals', () => {
  const t = { consecutive: 3, monthlyPercent: 10, lateCount: 5 };
  const days = (statuses: string[]) =>
    statuses.map((status, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, status: status as never }));

  it('3 faltas injustificadas seguidas al final generan alerta', () => {
    const r = computeRiskSignals(days(['PRESENT', 'PRESENT', 'ABSENT_UNJUSTIFIED', 'ABSENT_UNJUSTIFIED', 'ABSENT_UNJUSTIFIED']), t);
    expect(r.find((s) => s.reason === 'CONSECUTIVE_ABSENCES')?.metricValue).toBe(3);
  });
  it('faltas justificadas no generan alerta', () => {
    const r = computeRiskSignals(days(['PRESENT', 'ABSENT_JUSTIFIED', 'ABSENT_JUSTIFIED', 'ABSENT_JUSTIFIED', 'ABSENT_JUSTIFIED']), t);
    expect(r).toEqual([]);
  });
  it('porcentaje mensual', () => {
    const statuses = Array.from({ length: 20 }, (_, i) => (i < 2 ? 'ABSENT_UNJUSTIFIED' : 'PRESENT'));
    const r = computeRiskSignals(days(statuses), t);
    expect(r.find((s) => s.reason === 'MONTHLY_ABSENCE_RATE')?.metricValue).toBe(10);
  });
  it('no evalúa porcentaje con menos de 5 días', () => {
    const r = computeRiskSignals(days(['ABSENT_UNJUSTIFIED', 'PRESENT']), t);
    expect(r.some((s) => s.reason === 'MONTHLY_ABSENCE_RATE')).toBe(false);
  });
  it('tardanzas repetidas', () => {
    const r = computeRiskSignals(days(Array(5).fill('LATE_UNJUSTIFIED')), t);
    expect(r.some((s) => s.reason === 'REPEATED_LATENESS')).toBe(true);
  });
});

describe('limaWeekday', () => {
  it('usa la hora de Lima (domingo 01:00 UTC = sábado en Lima)', () => {
    expect(limaWeekday(new Date('2026-11-08T01:00:00.000Z'))).toBe(6);
  });
});

describe('A2 & A3: isSchoolDay', () => {
  const activeYear = {
    year: 2026,
    startDate: '2026-03-02',
    endDate: '2026-12-18',
  };
  const holidays = new Map([
    ['2026-05-01', 'Día del Trabajo'],
    ['2026-07-28', 'Fiestas Patrias'],
  ]);

  it('detecta fin de semana (sábado y domingo)', () => {
    // 2026-04-18 es sábado, 2026-04-19 es domingo
    const sab = isSchoolDay('2026-04-18', activeYear, holidays);
    expect(sab.isSchoolDay).toBe(false);
    expect(sab.reason).toBe('WEEKEND');

    const dom = isSchoolDay('2026-04-19', activeYear, holidays);
    expect(dom.isSchoolDay).toBe(false);
    expect(dom.reason).toBe('WEEKEND');
  });

  it('detecta feriado oficial', () => {
    const res = isSchoolDay('2026-05-01', activeYear, holidays);
    expect(res.isSchoolDay).toBe(false);
    expect(res.reason).toBe('HOLIDAY');
    expect(res.message).toContain('Día del Trabajo');
  });

  it('detecta fecha fuera del año escolar', () => {
    // 2026-02-16 es lunes (antes del inicio del año 2026-03-02)
    const beforeYear = isSchoolDay('2026-02-16', activeYear, holidays);
    expect(beforeYear.isSchoolDay).toBe(false);
    expect(beforeYear.reason).toBe('OUT_OF_YEAR');

    // 2026-12-22 es martes (después del fin del año 2026-12-18)
    const afterYear = isSchoolDay('2026-12-22', activeYear, holidays);
    expect(afterYear.isSchoolDay).toBe(false);
    expect(afterYear.reason).toBe('OUT_OF_YEAR');
  });

  it('retorna true para un día lectivo válido', () => {
    // 2026-04-20 es lunes
    const res = isSchoolDay('2026-04-20', activeYear, holidays);
    expect(res.isSchoolDay).toBe(true);
    expect(res.reason).toBeUndefined();
  });
});
