import { describe, expect, it } from 'vitest';
import {
  can,
  cashDifference,
  computeSessionTotals,
  differenceLabel,
  financeLevel,
  formatExpenseNumber,
  formatReceiptNumber,
  requiresOperationNumber,
  validateExpenseAmount,
  validateReason,
  voidBlockReason,
} from '../finance.rules';

describe('permisos de finanzas', () => {
  it('Dirección tiene acceso total', () => {
    expect(financeLevel('SCHOOL_ADMIN', null)).toBe('ADMIN');
    expect(financeLevel('SUPER_ADMIN', null)).toBe('ADMIN');
  });

  it('el administrativo sin rol en finanzas es cajero', () => {
    const level = financeLevel('ADMINISTRATIVE', null);
    expect(level).toBe('CASHIER');
    expect(can(level, 'collect')).toBe(true);
    expect(can(level, 'manage')).toBe(false);
    expect(can(level, 'view')).toBe(false);
  });

  it('el tesorero cobra, gestiona y ve; el contador solo ve', () => {
    expect(can(financeLevel('ADMINISTRATIVE', 'TREASURER'), 'manage')).toBe(true);
    const accountant = financeLevel('ADMINISTRATIVE', 'ACCOUNTANT');
    expect(can(accountant, 'view')).toBe(true);
    expect(can(accountant, 'collect')).toBe(false);
    expect(can(accountant, 'manage')).toBe(false);
  });

  it('docentes y apoderados no tienen acceso aunque tengan rol en finanzas', () => {
    expect(financeLevel('TEACHER', 'TREASURER')).toBe('NONE');
    expect(financeLevel('PARENT', null)).toBe('NONE');
  });
});

describe('correlativos y medios', () => {
  it('numera recibos y egresos con 6 dígitos', () => {
    expect(formatReceiptNumber(42)).toBe('REC-000042');
    expect(formatExpenseNumber(7)).toBe('EGR-000007');
  });

  it('solo el efectivo no exige número de operación', () => {
    expect(requiresOperationNumber('CASH')).toBe(false);
    expect(requiresOperationNumber('YAPE')).toBe(true);
    expect(requiresOperationNumber('CREDIT_CARD')).toBe(true);
  });
});

describe('anulaciones', () => {
  it('exige motivo', () => {
    expect(validateReason('')).not.toBeNull();
    expect(validateReason('err')).not.toBeNull();
    expect(validateReason('Monto equivocado')).toBeNull();
  });

  it('solo se anula lo activo y con caja abierta (o sin caja)', () => {
    expect(voidBlockReason({ status: 'ACTIVE', cashSessionStatus: 'OPEN' })).toBeNull();
    expect(voidBlockReason({ status: 'ACTIVE', cashSessionStatus: null })).toBeNull();
    expect(voidBlockReason({ status: 'VOIDED', cashSessionStatus: 'OPEN' })).toMatch(/ya fue anulado/);
    expect(voidBlockReason({ status: 'ACTIVE', cashSessionStatus: 'CLOSED' })).toMatch(/reabra/);
    expect(voidBlockReason({ status: 'ACTIVE', cashSessionStatus: 'REVIEWED' })).toMatch(/definitivamente/);
  });
});

describe('arqueo de caja', () => {
  const movements = {
    openingAmount: '100.00',
    payments: [
      { amountPaid: '420.00', paymentMethod: 'CASH', status: 'ACTIVE' },
      { amountPaid: '0.10', paymentMethod: 'CASH', status: 'ACTIVE' },
      { amountPaid: '0.20', paymentMethod: 'CASH', status: 'ACTIVE' },
      { amountPaid: '450.00', paymentMethod: 'YAPE', status: 'ACTIVE' },
      { amountPaid: '380.00', paymentMethod: 'PLIN', status: 'ACTIVE' },
      { amountPaid: '999.00', paymentMethod: 'CASH', status: 'VOIDED' },
    ],
    expenses: [
      { amount: '25.50', status: 'ACTIVE' },
      { amount: '80.00', status: 'VOIDED' },
    ],
  };

  it('separa por medio de pago e ignora lo anulado', () => {
    const t = computeSessionTotals(movements);
    expect(t.byMethod.CASH).toBe(420.3);
    expect(t.byMethod.YAPE).toBe(450);
    expect(t.byMethod.PLIN).toBe(380);
    expect(t.countByMethod.CASH).toBe(3);
    expect(t.totalCollected).toBe(1250.3);
    expect(t.paymentsCount).toBe(5);
    expect(t.voidedCount).toBe(1);
    expect(t.expensesTotal).toBe(25.5);
    expect(t.expensesCount).toBe(1);
  });

  it('efectivo esperado = fondo + cobros en efectivo − egresos (sin errores de redondeo)', () => {
    expect(computeSessionTotals(movements).expectedCash).toBe(494.8);
  });

  it('calcula sobrante y faltante', () => {
    expect(cashDifference(494.8, 494.8)).toBe(0);
    expect(cashDifference(494.8, 500)).toBe(5.2);
    expect(cashDifference(494.8, 490)).toBe(-4.8);
    expect(differenceLabel(0)).toBe('Cuadrada');
    expect(differenceLabel(5.2)).toBe('Sobrante de S/ 5.20');
    expect(differenceLabel(-4.8)).toBe('Faltante de S/ 4.80');
  });

  it('un egreso no puede superar el efectivo disponible', () => {
    expect(validateExpenseAmount(100, 100)).toBeNull();
    expect(validateExpenseAmount(100, 100.01)).toMatch(/supera el efectivo/);
    expect(validateExpenseAmount(100, 0)).toMatch(/mayor a cero/);
  });
});
