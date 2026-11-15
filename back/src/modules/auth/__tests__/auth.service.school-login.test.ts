import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/prisma', () => ({ prisma: {} }));
vi.mock('../../../core/security/principal-status', () => ({ invalidatePrincipalCache: vi.fn() }));
vi.mock('../../../utils/hash.util', () => ({
  hashPassword: vi.fn(async (p: string) => `hash:${p}`),
  comparePassword: vi.fn(async (p: string, h: string) => h === `hash:${p}`),
}));
vi.mock('../../../utils/jwt.util', () => ({ signToken: vi.fn(() => 'token') }));

import { AuthService } from '../auth.service';
import type { AuthRepository } from '../auth.repository';

const user = (schoolId: string) => ({
  id: `u-${schoolId}`,
  schoolId,
  email: 'padre@x.pe',
  passwordHash: 'hash:Clave123',
  role: 'PARENT',
  firstName: 'Ana',
  lastNamePaternal: 'Pérez',
  documentId: '12345678',
  isActive: true,
  lockedUntil: null,
  failedLoginAttempts: 0,
  mustChangePassword: false,
});

describe('login desde la página del colegio', () => {
  let repo: Record<string, ReturnType<typeof vi.fn>>;
  let service: AuthService;

  beforeEach(() => {
    repo = {
      findActiveSchoolIdBySlug: vi.fn(),
      findSchoolBySlug: vi.fn(),
      findSchoolById: vi.fn(),
      findUsersByIdentifier: vi.fn(async () => []),
      findStudentsByIdentifier: vi.fn(async () => []),
      registerFailedUserLogin: vi.fn(),
      resetUserLoginCounters: vi.fn(),
    };
    service = new AuthService(repo as unknown as AuthRepository);
  });

  it('sin código busca en toda la plataforma (comportamiento de siempre)', async () => {
    repo.findUsersByIdentifier.mockResolvedValue([user('s1')]);
    const res = await service.login({ email: 'padre@x.pe', password: 'Clave123' });
    expect(res.user.schoolId).toBe('s1');
    expect(repo.findActiveSchoolIdBySlug).not.toHaveBeenCalled();
    expect(repo.findUsersByIdentifier).toHaveBeenCalledWith('padre@x.pe', undefined);
  });

  it('con código limita la búsqueda a ese colegio', async () => {
    repo.findSchoolBySlug.mockResolvedValue({ id: 's2', isActive: true });
    repo.findUsersByIdentifier.mockResolvedValue([user('s2')]);
    repo.findSchoolById.mockResolvedValue({ id: 's2', isActive: true });
    const res = await service.login({ email: '12345678', password: 'Clave123', schoolSlug: 'innova' });
    expect(res.user.schoolId).toBe('s2');
    expect(repo.findUsersByIdentifier).toHaveBeenCalledWith('12345678', 's2');
  });

  it('una cuenta de otro colegio no entra por esta página', async () => {
    repo.findSchoolBySlug.mockResolvedValue({ id: 's2', isActive: true });
    await expect(service.login({ email: 'padre@x.pe', password: 'Clave123', schoolSlug: 'innova' })).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(repo.findStudentsByIdentifier).toHaveBeenCalledWith('padre@x.pe', 's2');
  });

  it('un código inexistente se rechaza con 404', async () => {
    repo.findSchoolBySlug.mockResolvedValue(null);
    await expect(service.login({ email: 'padre@x.pe', password: 'Clave123', schoolSlug: 'nada' })).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(repo.findUsersByIdentifier).not.toHaveBeenCalled();
  });

  it('A6: login contra colegio suspendido responde 403 con mensaje de suspensión', async () => {
    repo.findSchoolBySlug.mockResolvedValue({ id: 's-suspended', isActive: false });
    await expect(service.login({ email: 'padre@x.pe', password: 'Clave123', schoolSlug: 'suspendido' })).rejects.toMatchObject({
      statusCode: 403,
      message: 'El acceso de tu colegio está suspendido. Comunícate con la dirección o con soporte de KIPUX.',
    });
  });

  it('A6: login directo de usuario con colegio suspendido responde 403', async () => {
    repo.findUsersByIdentifier.mockResolvedValue([user('s-suspended')]);
    repo.findSchoolById.mockResolvedValue({ id: 's-suspended', isActive: false });
    await expect(service.login({ email: 'padre@x.pe', password: 'Clave123' })).rejects.toMatchObject({
      statusCode: 403,
      message: 'El acceso de tu colegio está suspendido. Comunícate con la dirección o con soporte de KIPUX.',
    });
  });

  it('A6: SUPER_ADMIN puede ingresar incluso si el colegio está suspendido', async () => {
    const superAdmin = { ...user('s-suspended'), role: 'SUPER_ADMIN' };
    repo.findUsersByIdentifier.mockResolvedValue([superAdmin]);
    repo.findSchoolById.mockResolvedValue({ id: 's-suspended', isActive: false });
    const res = await service.login({ email: 'padre@x.pe', password: 'Clave123' });
    expect(res.user.role).toBe('SUPER_ADMIN');
  });
});
