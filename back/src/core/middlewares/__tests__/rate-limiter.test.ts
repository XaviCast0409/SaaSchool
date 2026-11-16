import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Request } from 'express';

const SECRET = 'secreto-de-prueba-con-mas-de-32-caracteres';
vi.mock('../../../config/env', () => ({ env: { JWT_SECRET: 'secreto-de-prueba-con-mas-de-32-caracteres', JWT_EXPIRES_IN: '1h' } }));

import { verifiedUserKey } from '../rate-limiter.middleware';

const req = (authorization?: string) => ({ headers: { authorization }, ip: '1.2.3.4' }) as unknown as Request;

describe('verifiedUserKey (límite de peticiones por usuario)', () => {
  it('usa el usuario de un token con firma válida', () => {
    const token = jwt.sign({ userId: 'u-1', schoolId: 's', role: 'TEACHER' }, SECRET);
    expect(verifiedUserKey(req(`Bearer ${token}`))).toBe('u-1');
  });

  it('ignora un token falsificado con el id de otra persona (no puede agotarle el cupo)', () => {
    const forged = jwt.sign({ userId: 'victima', schoolId: 's', role: 'TEACHER' }, 'otra-clave-que-no-es-la-del-servidor');
    expect(verifiedUserKey(req(`Bearer ${forged}`))).toBeNull();
  });

  it('ignora un token sin firma (alg none) o basura', () => {
    const unsigned = jwt.sign({ userId: 'victima' }, '', { algorithm: 'none' } as jwt.SignOptions);
    expect(verifiedUserKey(req(`Bearer ${unsigned}`))).toBeNull();
    expect(verifiedUserKey(req('Bearer basura'))).toBeNull();
    expect(verifiedUserKey(req())).toBeNull();
  });

  it('ignora un token vencido', () => {
    const expired = jwt.sign({ userId: 'u-1', exp: Math.floor(Date.now() / 1000) - 60 }, SECRET);
    expect(verifiedUserKey(req(`Bearer ${expired}`))).toBeNull();
  });
});
