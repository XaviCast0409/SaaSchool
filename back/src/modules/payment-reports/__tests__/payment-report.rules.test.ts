import { describe, it, expect } from 'vitest';
import { isValidOperationNumber, normalizeOperationNumber, validatePaidOn, validateReportedAmount } from '../payment-report.rules';

describe('pagos reportados', () => {
  it('normaliza el número de operación para detectar duplicados', () => {
    expect(normalizeOperationNumber(' 00123 456-78 ')).toBe('12345678');
    expect(normalizeOperationNumber('ab-12cd')).toBe('AB12CD');
    expect(normalizeOperationNumber('0')).toBe('0');
    expect(isValidOperationNumber('123')).toBe(false);
    expect(isValidOperationNumber('YP 0098 7766')).toBe(true);
  });

  it('el monto no supera el saldo menos lo ya reportado y pendiente', () => {
    expect(validateReportedAmount(350, 0, 350)).toBeNull();
    expect(validateReportedAmount(350, 0, 350.01)).toMatch(/supera/);
    expect(validateReportedAmount(350, 200, 150)).toBeNull();
    expect(validateReportedAmount(350, 200, 151)).toMatch(/150\.00/);
    expect(validateReportedAmount(350, 350, 10)).toMatch(/espera la validación/);
    expect(validateReportedAmount(350, 0, 0)).toMatch(/mayor a cero/);
  });

  it('la fecha de pago no es futura ni muy antigua', () => {
    expect(validatePaidOn('2026-11-12', '2026-11-12')).toBeNull();
    expect(validatePaidOn('2026-11-13', '2026-11-12')).toMatch(/futura/);
    expect(validatePaidOn('2026-07-01', '2026-11-12')).toMatch(/90 días/);
  });
});
