import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

const upsert = vi.fn(async () => ({}));
vi.mock('../../../config/prisma', () => ({ prisma: { revokedToken: { upsert: (...a: unknown[]) => upsert(...(a as [])) } } }));
vi.mock('../../../config/env', () => ({ env: { JWT_SECRET: 'secreto-de-prueba-con-mas-de-32-caracteres', JWT_EXPIRES_IN: '1h' } }));

import { __resetRevokedTokens, isTokenRevoked, revokeToken } from '../token-revocation';
import { signToken } from '../../../utils/jwt.util';

describe('cierre de sesión en el servidor', () => {
  beforeEach(() => {
    __resetRevokedTokens();
    upsert.mockClear();
  });

  it('cada token tiene un id único (jti) y no arrastra jti/exp de otro token', () => {
    const a = jwt.decode(signToken({ userId: 'u', schoolId: 's', role: 'TEACHER' })) as { jti: string };
    const b = jwt.decode(signToken({ userId: 'u', schoolId: 's', role: 'TEACHER', jti: 'viejo', exp: 1 } as never)) as { jti: string; exp: number };
    expect(a.jti).toBeTruthy();
    expect(b.jti).not.toBe('viejo');
    expect(b.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(a.jti).not.toBe(b.jti);
  });

  it('un token revocado deja de valer hasta su vencimiento y se persiste', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    expect(isTokenRevoked('t-1')).toBe(false);
    await revokeToken('t-1', exp);
    expect(isTokenRevoked('t-1')).toBe(true);
    expect(isTokenRevoked('t-2')).toBe(false);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { jti: 't-1' } }));
  });

  it('no guarda tokens ya vencidos', async () => {
    await revokeToken('t-old', Math.floor(Date.now() / 1000) - 10);
    expect(isTokenRevoked('t-old')).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('tokens antiguos sin jti no se consideran revocados', () => {
    expect(isTokenRevoked(undefined)).toBe(false);
  });
});
