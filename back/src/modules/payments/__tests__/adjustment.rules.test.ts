import { describe, expect, it } from 'vitest';
import {
  adjustmentSign,
  applyAdjustment,
  formatAdjustmentNumber,
  lateFeeInterest,
  pendingLateFee,
  scholarshipAmount,
  scholarshipCovers,
} from '../adjustment.rules';

describe('ajustes a cuotas', () => {
  it('la mora suma y lo demás resta', () => {
    expect(adjustmentSign('LATE_FEE')).toBe(1);
    expect(adjustmentSign('DISCOUNT')).toBe(-1);
    expect(adjustmentSign('SCHOLARSHIP')).toBe(-1);
    expect(adjustmentSign('CREDIT_NOTE')).toBe(-1);
    expect(formatAdjustmentNumber(3)).toBe('AJ-000003');
  });

  it('aplica y revierte sin errores de redondeo', () => {
    expect(applyAdjustment('450.00', 0, 'DISCOUNT', '45.10')).toEqual({ newDue: 404.9 });
    expect(applyAdjustment('404.90', 0, 'DISCOUNT', '45.10', -1)).toEqual({ newDue: 450 });
    expect(applyAdjustment('450', 0, 'LATE_FEE', '0.30')).toEqual({ newDue: 450.3 });
  });

  it('no deja la cuota por debajo de lo pagado ni negativa', () => {
    expect(applyAdjustment(450, 300, 'DISCOUNT', 200)).toHaveProperty('error');
    expect(applyAdjustment(450, 0, 'CREDIT_NOTE', 500)).toHaveProperty('error');
    expect(applyAdjustment(450, 0, 'DISCOUNT', 0)).toHaveProperty('error');
    // Anular una mora tampoco puede dejarla por debajo de lo pagado
    expect(applyAdjustment(460, 460, 'LATE_FEE', 10, -1)).toHaveProperty('error');
    // Beca del 100 % sin pagos: la cuota queda en cero
    expect(applyAdjustment(450, 0, 'SCHOLARSHIP', 450)).toEqual({ newDue: 0 });
  });
});

describe('becas', () => {
  it('calcula porcentaje sobre el monto original y fijo sin pasarse', () => {
    expect(scholarshipAmount(450, 'PERCENT', 50)).toBe(225);
    expect(scholarshipAmount(420, 'PERCENT', 33.33)).toBe(139.99);
    expect(scholarshipAmount(450, 'FIXED', 100)).toBe(100);
    expect(scholarshipAmount(80, 'FIXED', 100)).toBe(80);
    expect(scholarshipAmount(450, 'PERCENT', 120)).toBe(0);
  });

  it('cubre según concepto y vigencia', () => {
    const s = { concepts: ['PENSION'], validFrom: '2026-03-01', validTo: '2026-07-31' };
    expect(scholarshipCovers(s, 'PENSION', '2026-04-10')).toBe(true);
    expect(scholarshipCovers(s, 'MATRICULA', '2026-04-10')).toBe(false);
    expect(scholarshipCovers(s, 'PENSION', '2026-08-10')).toBe(false);
    expect(scholarshipCovers({ ...s, validTo: null }, 'PENSION', '2026-12-10')).toBe(true);
  });
});

describe('mora (interés moratorio)', () => {
  it('saldo × tasa anual / 360 × días, después de la gracia', () => {
    // 450 × 4.5 % / 360 × 30 días = 1.6875 → 1.69
    expect(lateFeeInterest(450, 4.5, 30)).toBe(1.69);
    expect(lateFeeInterest(450, 4.5, 3, 5)).toBe(0);
    expect(lateFeeInterest(450, 4.5, 10, 5)).toBe(0.56);
    expect(lateFeeInterest(450, 0, 30)).toBe(0);
    expect(lateFeeInterest(0, 4.5, 30)).toBe(0);
  });

  it('solo carga la diferencia con lo ya cargado', () => {
    expect(pendingLateFee(1.69, 0.56)).toBe(1.13);
    expect(pendingLateFee(0.5, 0.56)).toBe(0);
  });
});
