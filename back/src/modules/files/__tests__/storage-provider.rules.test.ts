import { describe, it, expect } from 'vitest';
import { buildObjectKey, resolveStorageProvider, trashKeyFor } from '../storage-provider.rules';

describe('elección del almacenamiento para archivos nuevos', () => {
  it('con R2 configurado siempre usa R2', () => {
    expect(resolveStorageProvider({ r2Configured: true, isProduction: true })).toBe('R2');
    expect(resolveStorageProvider({ r2Configured: true, isProduction: false })).toBe('R2');
  });

  it('sin R2, el disco local solo se usa en desarrollo', () => {
    expect(resolveStorageProvider({ r2Configured: false, isProduction: false })).toBe('LOCAL');
    expect(resolveStorageProvider({ r2Configured: false, isProduction: true })).toBeNull();
  });
});

describe('clave del objeto en R2', () => {
  const now = new Date('2026-11-14T12:00:00Z');
  const id = '123e4567-e89b-12d3-a456-426614174000';

  it('ordena por colegio, año y propósito, sin el nombre original', () => {
    expect(buildObjectKey({ schoolId: 's1', purpose: 'PAYMENT_VOUCHER', fileName: 'Voucher Ana Pérez.JPG', id, now })).toBe(
      `s1/2026/PAYMENT_VOUCHER/${id}.jpg`,
    );
  });

  it('descarta extensiones raras y propósitos con caracteres inválidos', () => {
    expect(buildObjectKey({ schoolId: 's1', purpose: '../x', fileName: 'sin-extension', id, now })).toBe(`s1/2026/x/${id}`);
    expect(buildObjectKey({ schoolId: 's1', purpose: '', fileName: 'a.extensionmuylarga', id, now })).toBe(`s1/2026/OTHER/${id}`);
  });

  it('la papelera usa su propio prefijo', () => {
    expect(trashKeyFor('s1/2026/OTHER/abc.pdf')).toBe('papelera/s1/2026/OTHER/abc.pdf');
  });
});
