import { describe, expect, it } from 'vitest';
import { addTotals, agingBucket, groupSum, obligationTotals } from '../report.rules';

describe('reportes financieros', () => {
  it('clasifica la antigüedad de la deuda', () => {
    expect(agingBucket(1)).toBe('0-30');
    expect(agingBucket(30)).toBe('0-30');
    expect(agingBucket(31)).toBe('31-60');
    expect(agingBucket(90)).toBe('61-90');
    expect(agingBucket(91)).toBe('90+');
  });

  it('agrupa y suma sin errores de redondeo', () => {
    const rows = [
      { m: 'CASH', a: '0.10' },
      { m: 'CASH', a: '0.20' },
      { m: 'YAPE', a: '450' },
    ];
    expect(groupSum(rows, (r) => r.m, (r) => r.a)).toEqual([
      { key: 'CASH', total: 0.3, count: 2 },
      { key: 'YAPE', total: 450, count: 1 },
    ]);
  });

  it('totales de una cuota con ajustes y pagos (ignora anulados)', () => {
    const t = obligationTotals({
      originalAmount: '450',
      amountDue: '226.69',
      adjustments: [
        { type: 'SCHOLARSHIP', amount: '225', status: 'ACTIVE' },
        { type: 'LATE_FEE', amount: '1.69', status: 'ACTIVE' },
        { type: 'DISCOUNT', amount: '50', status: 'VOIDED' },
      ],
      payments: [
        { amountPaid: '100', status: 'ACTIVE' },
        { amountPaid: '100', status: 'VOIDED' },
      ],
    });
    expect(t).toEqual({ original: 450, discounts: 225, lateFees: 1.69, net: 226.69, paid: 100, balance: 126.69 });
  });

  it('suma totales campo a campo', () => {
    expect(addTotals([{ a: 0.1, b: 1 }, { a: 0.2, b: 2 }], ['a', 'b'])).toEqual({ a: 0.3, b: 3 });
  });
});
