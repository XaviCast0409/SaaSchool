import { describe, it, expect } from 'vitest';
import { formatMoney } from '../format';

describe('formatMoney', () => {
  it('formats positive float with default symbol and two decimals', () => {
    expect(formatMoney(1234.5)).toBe('S/ 1,234.50');
  });

  it('formats string input as number', () => {
    expect(formatMoney('350.5')).toBe('S/ 350.50');
  });

  it('formats null as zero', () => {
    expect(formatMoney(null)).toBe('S/ 0.00');
  });

  it('formats NaN as zero', () => {
    expect(formatMoney(NaN)).toBe('S/ 0.00');
  });

  it('formats with custom zero decimals', () => {
    expect(formatMoney(1500, { decimals: 0 })).toBe('S/ 1,500');
  });

  it('formats without currency symbol when symbol is false', () => {
    expect(formatMoney(99.9, { symbol: false })).toBe('99.90');
  });
});
