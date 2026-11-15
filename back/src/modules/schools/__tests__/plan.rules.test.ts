import { describe, it, expect } from 'vitest';
import {
  getPlanStatus,
  planAllowsWrites,
  studentQuotaFor,
  effectiveMonthlyFee,
  addMonthsKey,
  renewedExpiryKey,
} from '../plan.rules';

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
    expect(effectiveMonthlyFee({ plan: 'PRO', monthlyFee: null })).toBe(350);
    expect(effectiveMonthlyFee({ plan: 'PRO', monthlyFee: '520.50' })).toBe(520.5);
    expect(effectiveMonthlyFee({ plan: 'BASIC', monthlyFee: 0 })).toBe(0);
  });
});

describe('renovación al registrar un pago', () => {
  it('suma meses y ajusta al último día si el mes destino es más corto', () => {
    expect(addMonthsKey('2026-01-15', 1)).toBe('2026-02-15');
    expect(addMonthsKey('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsKey('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonthsKey('2026-11-30', 3)).toBe('2027-02-28');
    expect(addMonthsKey('2026-03-31', 12)).toBe('2027-03-31');
  });

  it('renovar antes de vencer no hace perder días: corre desde el vencimiento', () => {
    expect(renewedExpiryKey(EXPIRES, 1, limaNoon('2026-03-10'))).toBe('2026-04-30');
  });

  it('en gracia o solo lectura también corre desde el vencimiento (esos días se pagan)', () => {
    expect(renewedExpiryKey(EXPIRES, 1, limaNoon('2026-04-05'))).toBe('2026-04-30');
    expect(renewedExpiryKey(EXPIRES, 1, limaNoon('2026-04-20'))).toBe('2026-04-30');
  });

  it('ya bloqueado o sin fecha, corre desde hoy', () => {
    expect(renewedExpiryKey(EXPIRES, 1, limaNoon('2026-06-10'))).toBe('2026-07-10');
    expect(renewedExpiryKey(null, 2, limaNoon('2026-06-10'))).toBe('2026-08-10');
  });
});
