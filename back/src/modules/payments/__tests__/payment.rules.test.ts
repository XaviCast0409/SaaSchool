import { describe, it, expect } from 'vitest';
import {
  toCents,
  sumPaidCents,
  computeObligationStatus,
  remainingBalance,
  validateNewPayment,
  daysOverdue,
} from '../payment.rules';

describe('toCents', () => {
  it('evita errores de coma flotante', () => {
    expect(toCents(0.1) + toCents(0.2)).toBe(toCents(0.3));
  });
  it('acepta strings y objetos tipo Decimal', () => {
    expect(toCents('350.50')).toBe(35050);
    expect(toCents({ toString: () => '12.345' })).toBe(1235);
  });
  it('rechaza montos no numéricos', () => {
    expect(() => toCents('abc')).toThrow();
  });
});

describe('computeObligationStatus', () => {
  it('sin pagos queda PENDING', () => {
    expect(computeObligationStatus(350, [])).toBe('PENDING');
  });
  it('pago parcial queda PARTIAL', () => {
    expect(computeObligationStatus(350, [{ amountPaid: 100 }])).toBe('PARTIAL');
  });
  it('pagos que completan el monto exacto quedan PAID aunque haya decimales', () => {
    expect(computeObligationStatus('0.30', [{ amountPaid: 0.1 }, { amountPaid: 0.2 }])).toBe('PAID');
    expect(computeObligationStatus(350.5, [{ amountPaid: '200.25' }, { amountPaid: '150.25' }])).toBe('PAID');
  });
  it('al anular un pago (lista vacía) vuelve a PENDING', () => {
    expect(computeObligationStatus(350, [])).toBe('PENDING');
  });
});

describe('remainingBalance y sumPaidCents', () => {
  it('calcula saldo sin negativos', () => {
    expect(remainingBalance(350, [{ amountPaid: 100 }])).toBe(250);
    expect(remainingBalance(100, [{ amountPaid: 150 }])).toBe(0);
    expect(sumPaidCents([{ amountPaid: 10.1 }, { amountPaid: 20.2 }])).toBe(3030);
  });
});

describe('validateNewPayment', () => {
  it('permite pagar el saldo exacto', () => {
    expect(validateNewPayment(350, [{ amountPaid: 100 }], 250)).toBeNull();
  });
  it('rechaza pagar más que el saldo', () => {
    expect(validateNewPayment(350, [{ amountPaid: 100 }], 250.01)).toMatch(/supera el saldo/);
  });
  it('rechaza montos cero o negativos', () => {
    expect(validateNewPayment(350, [], 0)).toMatch(/mayor a cero/);
    expect(validateNewPayment(350, [], -5)).toMatch(/mayor a cero/);
  });
});

describe('daysOverdue', () => {
  const due = new Date('2026-11-10T05:00:00Z');
  it('0 si aún no vence', () => expect(daysOverdue(due, new Date('2026-11-09T12:00:00Z'))).toBe(0));
  it('cuenta días completos de atraso', () => expect(daysOverdue(due, new Date('2026-11-17T06:00:00Z'))).toBe(7));
});
