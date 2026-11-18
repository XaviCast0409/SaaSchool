import { describe, it, expect, vi } from 'vitest';
import type ExcelJS from 'exceljs';
import { colLetter, safeNumber, safeMerge, thinBorders, solidFill } from '../base';

describe('Excel base utilities', () => {
  it('converts column index to Excel column letters', () => {
    expect(colLetter(1)).toBe('A');
    expect(colLetter(27)).toBe('AA');
    expect(colLetter(703)).toBe('AAA');
  });

  it('sanitizes numbers safely with safeNumber', () => {
    expect(safeNumber('')).toBe('');
    expect(safeNumber('12.345', 2)).toBe(12.35);
    expect(safeNumber('abc')).toBe('');
    expect(safeNumber(null)).toBe('');
    expect(safeNumber(undefined)).toBe('');
    expect(safeNumber(10)).toBe(10);
  });

  it('merges worksheet cells safely without calling on degenerate or inverted ranges', () => {
    const ws = {
      mergeCells: vi.fn(),
    } as unknown as ExcelJS.Worksheet;

    safeMerge(ws, 1, 1, 1, 1);
    expect(ws.mergeCells).not.toHaveBeenCalled();

    safeMerge(ws, 3, 1, 1, 1);
    expect(ws.mergeCells).not.toHaveBeenCalled();

    safeMerge(ws, 1, 1, 1, 3);
    expect(ws.mergeCells).toHaveBeenCalledWith(1, 1, 1, 3);
  });

  it('creates thin borders configuration for an ARGB color', () => {
    const borders = thinBorders('FF000000');
    expect(borders.top).toEqual({ style: 'thin', color: { argb: 'FF000000' } });
    expect(borders.left).toEqual({ style: 'thin', color: { argb: 'FF000000' } });
    expect(borders.bottom).toEqual({ style: 'thin', color: { argb: 'FF000000' } });
    expect(borders.right).toEqual({ style: 'thin', color: { argb: 'FF000000' } });
  });

  it('creates solid pattern fill for an ARGB color', () => {
    expect(solidFill('FFFFFFFF')).toEqual({
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFFFF' },
    });
  });
});
