import { describe, it, expect } from 'vitest';
import { levelsForScope, expandSchoolDays, computeRiskSignals, daysBetween, limaWeekday } from '../attendance.rules';

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
