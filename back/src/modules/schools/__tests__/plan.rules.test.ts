import { describe, it, expect } from 'vitest';
import { getPlanStatus, planAllowsWrites, studentQuotaFor, effectiveMonthlyFee } from '../plan.rules';

// La fecha de vencimiento se guarda como medianoche UTC del día elegido
const EXPIRES = new Date('2026-03-31T00:00:00.000Z');
// Mediodía en Lima (UTC-5) del día indicado
const limaNoon = (day: string) => new Date(`${day}T17:00:00.000Z`);

describe('getPlanStatus (ciclo de un plan vencido)', () => {
  it('sin fecha de vencimiento siempre está vigente', () => {
    expect(getPlanStatus(null).access).toBe('ACTIVE');
  });

  it('el plan vale todo el día de su vencimiento, también de noche en Lima', () => {
    const s = getPlanStatus(EXPIRES, new Date('2026-04-01T04:30:00.000Z')); // 31/03 23:30 en Lima
    expect(s).toMatchObject({ access: 'ACTIVE', daysUntilExpiry: 0, daysOverdue: 0 });
  });

  it('cuenta los días que faltan', () => {
    expect(getPlanStatus(EXPIRES, limaNoon('2026-03-24')).daysUntilExpiry).toBe(7);
  });

  it('días 1 a 7 vencido: gracia (se puede seguir trabajando)', () => {
    expect(getPlanStatus(EXPIRES, limaNoon('2026-04-01'))).toMatchObject({ access: 'GRACE', daysOverdue: 1 });
    expect(getPlanStatus(EXPIRES, limaNoon('2026-04-07'))).toMatchObject({ access: 'GRACE', daysOverdue: 7 });
  });

  it('días 8 a 30 vencido: solo lectura', () => {
    expect(getPlanStatus(EXPIRES, limaNoon('2026-04-08')).access).toBe('READ_ONLY');
    expect(getPlanStatus(EXPIRES, limaNoon('2026-04-30')).access).toBe('READ_ONLY');
  });

  it('desde el día 31 vencido: bloqueado', () => {
    expect(getPlanStatus(EXPIRES, limaNoon('2026-05-01'))).toMatchObject({ access: 'BLOCKED', daysOverdue: 31 });
  });

  it('informa desde cuándo pasa a solo lectura y a bloqueo', () => {
    expect(getPlanStatus(EXPIRES, limaNoon('2026-03-01'))).toMatchObject({
      readOnlyFrom: '2026-04-08',
      blockedFrom: '2026-05-01',
    });
  });

  it('solo vigente o en gracia permiten escribir', () => {
    expect(planAllowsWrites('ACTIVE')).toBe(true);
    expect(planAllowsWrites('GRACE')).toBe(true);
    expect(planAllowsWrites('READ_ONLY')).toBe(false);
    expect(planAllowsWrites('BLOCKED')).toBe(false);
  });
});

describe('catálogo de planes', () => {
  it('cupos de alumnos por plan', () => {
    expect(studentQuotaFor('BASIC')).toBe(150);
    expect(studentQuotaFor('PRO')).toBe(500);
    expect(studentQuotaFor('ENTERPRISE')).toBe(Infinity);
    expect(studentQuotaFor('DESCONOCIDO')).toBe(150);
  });

  it('la mensualidad pactada reemplaza al precio de lista', () => {
    expect(effectiveMonthlyFee({ plan: 'PRO', monthlyFee: null })).toBe(650);
    expect(effectiveMonthlyFee({ plan: 'PRO', monthlyFee: '520.50' })).toBe(520.5);
    expect(effectiveMonthlyFee({ plan: 'BASIC', monthlyFee: 0 })).toBe(0);
  });
});
