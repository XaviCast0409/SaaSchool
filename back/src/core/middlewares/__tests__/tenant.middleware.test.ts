import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

const findUnique = vi.fn();
vi.mock('../../../config/prisma', () => ({ prisma: { school: { findUnique: (...a: unknown[]) => findUnique(...a) } } }));

import { tenantMiddleware } from '../tenant.middleware';

const SCHOOL_A = '11111111-1111-1111-1111-111111111111';
const SCHOOL_B = '22222222-2222-2222-2222-222222222222';

function makeReq(user: Record<string, unknown> | undefined, headers: Record<string, string> = {}) {
  return { user, headers } as unknown as Request;
}

describe('tenantMiddleware (aislamiento entre colegios)', () => {
  beforeEach(() => {
    findUnique.mockReset();
    findUnique.mockResolvedValue({ id: SCHOOL_A, isActive: true });
  });

  it('rechaza peticiones sin usuario', async () => {
    await expect(tenantMiddleware(makeReq(undefined), {} as Response, vi.fn())).rejects.toMatchObject({ statusCode: 401 });
  });

  it('un usuario normal NO puede cambiar de colegio con x-school-id', async () => {
    const req = makeReq({ id: 'u1', role: 'SCHOOL_ADMIN', schoolId: SCHOOL_A }, { 'x-school-id': SCHOOL_B });
    const next = vi.fn();
    await tenantMiddleware(req, {} as Response, next);
    expect((req as unknown as { user: { schoolId: string } }).user.schoolId).toBe(SCHOOL_A);
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: SCHOOL_A } }));
    expect(next).toHaveBeenCalled();
  });

  it('padres y docentes tampoco pueden cambiar de colegio', async () => {
    for (const role of ['PARENT', 'TEACHER', 'ADMINISTRATIVE', 'STUDENT']) {
      const req = makeReq({ id: 'u1', role, schoolId: SCHOOL_A }, { 'x-school-id': SCHOOL_B });
      await tenantMiddleware(req, {} as Response, vi.fn());
      expect((req as unknown as { user: { schoolId: string } }).user.schoolId).toBe(SCHOOL_A);
    }
  });

  it('solo SUPER_ADMIN puede entrar a otro colegio para soporte', async () => {
    findUnique.mockResolvedValue({ id: SCHOOL_B, isActive: true });
    const req = makeReq({ id: 'sa', role: 'SUPER_ADMIN', schoolId: null }, { 'x-school-id': SCHOOL_B });
    await tenantMiddleware(req, {} as Response, vi.fn());
    expect((req as unknown as { user: { schoolId: string } }).user.schoolId).toBe(SCHOOL_B);
  });

  it('rechaza si el usuario no tiene colegio', async () => {
    await expect(tenantMiddleware(makeReq({ id: 'u', role: 'TEACHER', schoolId: null }), {} as Response, vi.fn())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rechaza colegios inactivos o inexistentes', async () => {
    findUnique.mockResolvedValue({ id: SCHOOL_A, isActive: false });
    await expect(tenantMiddleware(makeReq({ id: 'u', role: 'TEACHER', schoolId: SCHOOL_A }), {} as Response, vi.fn())).rejects.toMatchObject({ statusCode: 401 });
    findUnique.mockResolvedValue(null);
    await expect(tenantMiddleware(makeReq({ id: 'u', role: 'TEACHER', schoolId: SCHOOL_A }), {} as Response, vi.fn())).rejects.toMatchObject({ statusCode: 401 });
  });
});
