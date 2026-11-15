import { describe, it, expect } from 'vitest';
import { buildObjectKey, resolveStorageProvider, trashKeyFor } from '../storage-provider.rules';

describe('elección del almacenamiento para archivos nuevos', () => {
  const base = { r2Configured: false, driveConfigured: false, isProduction: false };

  it('prefiere R2, luego Drive, luego disco local en desarrollo', () => {
    expect(resolveStorageProvider({ ...base, r2Configured: true, driveConfigured: true })).toBe('R2');
    expect(resolveStorageProvider({ ...base, driveConfigured: true })).toBe('GOOGLE_DRIVE');
    expect(resolveStorageProvider(base)).toBe('LOCAL');
  });

  it('en producción nunca usa el disco local', () => {
    expect(resolveStorageProvider({ ...base, isProduction: true })).toBeNull();
    expect(resolveStorageProvider({ ...base, isProduction: true, forced: 'local' })).toBeNull();
  });

  it('respeta FILE_STORAGE y no cae en otro almacenamiento si el forzado falta', () => {
    expect(resolveStorageProvider({ ...base, r2Configured: true, driveConfigured: true, forced: 'drive' })).toBe('GOOGLE_DRIVE');
    expect(resolveStorageProvider({ ...base, driveConfigured: true, forced: 'r2' })).toBeNull();
    expect(resolveStorageProvider({ ...base, r2Configured: true, forced: 'drive' })).toBeNull();
    expect(resolveStorageProvider({ ...base, r2Configured: true, forced: 'local' })).toBe('LOCAL');
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
