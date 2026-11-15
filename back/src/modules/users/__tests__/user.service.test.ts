import { describe, it, expect, vi } from 'vitest';
import { canManage, UserService } from '../user.service';
import type { UserRepository } from '../user.repository';
import { AppError } from '../../../core/errors/app-error';
import type { Role, User } from '@prisma/client';

describe('C1 & C2: User Roles Hierarchy & SuperAdmin Protection', () => {
  describe('canManage rule', () => {
    it('SUPER_ADMIN puede gestionar a todos los roles', () => {
      const roles: Role[] = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT'];
      for (const r of roles) {
        expect(canManage('SUPER_ADMIN', r)).toBe(true);
      }
    });

    it('SCHOOL_ADMIN gestiona personal y familias del colegio, nunca SUPER_ADMIN', () => {
      expect(canManage('SCHOOL_ADMIN', 'SUPER_ADMIN')).toBe(false);
      expect(canManage('SCHOOL_ADMIN', 'SCHOOL_ADMIN')).toBe(true);
      expect(canManage('SCHOOL_ADMIN', 'ADMINISTRATIVE')).toBe(true);
      expect(canManage('SCHOOL_ADMIN', 'TEACHER')).toBe(true);
      expect(canManage('SCHOOL_ADMIN', 'PARENT')).toBe(true);
    });

    it('ADMINISTRATIVE (secretaría) gestiona solo TEACHER y PARENT', () => {
      expect(canManage('ADMINISTRATIVE', 'SUPER_ADMIN')).toBe(false);
      expect(canManage('ADMINISTRATIVE', 'SCHOOL_ADMIN')).toBe(false);
      expect(canManage('ADMINISTRATIVE', 'ADMINISTRATIVE')).toBe(false);
      expect(canManage('ADMINISTRATIVE', 'TEACHER')).toBe(true);
      expect(canManage('ADMINISTRATIVE', 'PARENT')).toBe(true);
    });

    it('Otros roles no pueden gestionar a nadie', () => {
      expect(canManage('TEACHER', 'PARENT')).toBe(false);
      expect(canManage('PARENT', 'PARENT')).toBe(false);
    });
  });

  describe('C1: Nadie del colegio puede tocar una cuenta SUPER_ADMIN', () => {
    const mockRepo = {
      findByIdRaw: vi.fn(),
      findById: vi.fn(),
      findAllBySchool: vi.fn(),
      findByEmail: vi.fn(),
      findByDocumentId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deactivate: vi.fn(),
      reactivate: vi.fn(),
      updatePassword: vi.fn(),
    } as unknown as UserRepository;

    const service = new UserService(mockRepo);

    const superAdminUser = {
      id: 'super-1',
      role: 'SUPER_ADMIN' as Role,
      schoolId: 'school-1',
      firstName: 'Super',
      lastNamePaternal: 'Admin',
    } as User;

    it('Secretaria (ADMINISTRATIVE) recibe 404 al restablecer clave de SUPER_ADMIN', async () => {
      vi.mocked(mockRepo.findByIdRaw).mockResolvedValueOnce(superAdminUser);

      await expect(
        service.resetPassword('super-1', 'school-1', undefined, {
          role: 'ADMINISTRATIVE',
          userId: 'sec-1',
        }),
      ).rejects.toThrow(new AppError('Usuario no encontrado', 404));
    });

    it('Director (SCHOOL_ADMIN) recibe 404 al editar a un SUPER_ADMIN', async () => {
      vi.mocked(mockRepo.findByIdRaw).mockResolvedValueOnce(superAdminUser);

      await expect(
        service.updateUser(
          'super-1',
          'school-1',
          { firstName: 'Hack' },
          { role: 'SCHOOL_ADMIN', userId: 'dir-1' },
        ),
      ).rejects.toThrow(new AppError('Usuario no encontrado', 404));
    });

    it('Director (SCHOOL_ADMIN) recibe 404 al desactivar a un SUPER_ADMIN', async () => {
      vi.mocked(mockRepo.findByIdRaw).mockResolvedValueOnce(superAdminUser);

      await expect(
        service.deactivateUser('super-1', 'school-1', {
          role: 'SCHOOL_ADMIN',
          userId: 'dir-1',
        }),
      ).rejects.toThrow(new AppError('Usuario no encontrado', 404));
    });

    it('Secretaria (ADMINISTRATIVE) recibe 404 en getUserById si es SUPER_ADMIN', async () => {
      vi.mocked(mockRepo.findById).mockResolvedValueOnce(superAdminUser as any);

      await expect(
        service.getUserById('super-1', 'school-1', 'ADMINISTRATIVE'),
      ).rejects.toThrow(new AppError('Usuario no encontrado', 404));
    });
  });

  describe('C2: Jerarquía de roles y prevención de escalada de privilegios', () => {
    const mockRepo = {
      findByIdRaw: vi.fn(),
      findById: vi.fn(),
      findAllBySchool: vi.fn(),
      findByEmail: vi.fn(),
      findByDocumentId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deactivate: vi.fn(),
      reactivate: vi.fn(),
      updatePassword: vi.fn(),
    } as unknown as UserRepository;

    const service = new UserService(mockRepo);

    it('Secretaria (ADMINISTRATIVE) no puede crear un usuario SCHOOL_ADMIN ni ADMINISTRATIVE', async () => {
      await expect(
        service.createUser(
          'school-1',
          {
            firstName: 'Nuevo',
            lastNamePaternal: 'Admin',
            role: 'SCHOOL_ADMIN',
            documentType: 'DNI',
            email: 'admin2@school.pe',
          } as any,
          { role: 'ADMINISTRATIVE', userId: 'sec-1' },
        ),
      ).rejects.toThrow(new AppError('No tienes permiso para crear usuarios con este rol.', 403));
    });

    it('Secretaria (ADMINISTRATIVE) no puede cambiar roles (403)', async () => {
      const teacher = {
        id: 'doc-1',
        role: 'TEACHER' as Role,
        schoolId: 'school-1',
      } as User;
      vi.mocked(mockRepo.findByIdRaw).mockResolvedValueOnce(teacher);

      await expect(
        service.updateUser(
          'doc-1',
          'school-1',
          { role: 'SCHOOL_ADMIN' },
          { role: 'ADMINISTRATIVE', userId: 'sec-1' },
        ),
      ).rejects.toThrow(new AppError('No tienes permiso para cambiar roles.', 403));
    });

    it('Nadie puede cambiarse su propio rol (autopromoción, 403)', async () => {
      const dir = {
        id: 'dir-1',
        role: 'SCHOOL_ADMIN' as Role,
        schoolId: 'school-1',
      } as User;
      vi.mocked(mockRepo.findByIdRaw).mockResolvedValueOnce(dir);

      await expect(
        service.updateUser(
          'dir-1',
          'school-1',
          { role: 'SCHOOL_ADMIN' },
          { role: 'SCHOOL_ADMIN', userId: 'dir-1' },
        ),
      ).rejects.toThrow(new AppError('No puedes cambiar tu propio rol.', 403));
    });

    it('Secretaria no puede restablecer la clave de la directora (403)', async () => {
      const dir = {
        id: 'dir-1',
        role: 'SCHOOL_ADMIN' as Role,
        schoolId: 'school-1',
      } as User;
      vi.mocked(mockRepo.findByIdRaw).mockResolvedValueOnce(dir);

      await expect(
        service.resetPassword('dir-1', 'school-1', undefined, {
          role: 'ADMINISTRATIVE',
          userId: 'sec-1',
        }),
      ).rejects.toThrow(new AppError('No tienes permiso para gestionar a este usuario.', 403));
    });
  });
});

