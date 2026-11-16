import { describe, it, expect, vi } from 'vitest';

vi.mock('../../config/env', () => ({ env: { JWT_SECRET: 'x'.repeat(40) } }));

import {
  base32Decode,
  base32Encode,
  decryptTotpSecret,
  encryptTotpSecret,
  generateTotpSecret,
  totpAt,
  verifyTotp,
} from '../totp.util';

// Vector de prueba del RFC 6238 (SHA-1): secreto ASCII "12345678901234567890"
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));

describe('TOTP (RFC 6238)', () => {
  it('codifica y decodifica base32', () => {
    expect(RFC_SECRET).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    expect(base32Decode(RFC_SECRET).toString()).toBe('12345678901234567890');
  });

  it('coincide con los vectores oficiales (6 últimos dígitos)', () => {
    expect(totpAt(RFC_SECRET, Math.floor(59 / 30))).toBe('287082');
    expect(totpAt(RFC_SECRET, Math.floor(1111111109 / 30))).toBe('081804');
    expect(totpAt(RFC_SECRET, Math.floor(1234567890 / 30))).toBe('005924');
  });

  it('acepta ±1 paso y rechaza códigos reutilizados', () => {
    const now = 1234567890 * 1000;
    const step = Math.floor(1234567890 / 30);
    expect(verifyTotp(RFC_SECRET, '005924', null, now)).toBe(step);
    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, step - 1), null, now)).toBe(step - 1);
    expect(verifyTotp(RFC_SECRET, '005924', step, now)).toBeNull();
    expect(verifyTotp(RFC_SECRET, '000000', null, now)).toBeNull();
    expect(verifyTotp(RFC_SECRET, 'abc', null, now)).toBeNull();
  });

  it('cifra el secreto y lo recupera', () => {
    const secret = generateTotpSecret();
    const encrypted = encryptTotpSecret(secret);
    expect(encrypted).not.toContain(secret);
    expect(decryptTotpSecret(encrypted)).toBe(secret);
  });
});
