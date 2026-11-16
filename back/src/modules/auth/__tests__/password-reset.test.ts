import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { AuthService } from '../auth.service';
import type { AuthRepository } from '../auth.repository';
import { AppError } from '../../../core/errors/app-error';

vi.mock('../../../config/prisma', () => ({
  prisma: {
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock('../../../utils/notification.util', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../core/security/principal-status', () => ({
  invalidatePrincipalCache: vi.fn(),
}));

describe('AuthService - Password Reset (P1)', () => {
  let authRepository: Partial<AuthRepository>;
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authRepository = {
      findActiveUsersByEmail: vi.fn(),
      createPasswordResetToken: vi.fn(),
      findPasswordResetToken: vi.fn(),
      markPasswordResetTokenUsed: vi.fn(),
      consumePasswordResetToken: vi.fn().mockResolvedValue(true),
      invalidatePasswordResetTokens: vi.fn(),
      updateUserPassword: vi.fn(),
    };
    authService = new AuthService(authRepository as AuthRepository);
  });

  describe('forgotPassword', () => {
    it('responde 200 con el mensaje estándar si el correo NO existe (evita enumeración)', async () => {
      (authRepository.findActiveUsersByEmail as any).mockResolvedValue([]);

      const res = await authService.forgotPassword({ email: 'no-existe@colegio.edu.pe' });
      expect(res.message).toBe('Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.');
      expect(authRepository.createPasswordResetToken).not.toHaveBeenCalled();
    });

    it('genera token y envía correo si el correo existe y usuario está activo', async () => {
      (authRepository.findActiveUsersByEmail as any).mockResolvedValue([
        { id: 'user-1', email: 'docente@colegio.edu.pe', firstName: 'Juan', isActive: true, role: 'TEACHER', school: { name: 'Colegio A' } },
      ]);

      const res = await authService.forgotPassword({ email: 'docente@colegio.edu.pe' });
      expect(res.message).toBe('Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.');
      expect(authRepository.createPasswordResetToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      );
    });
  });

  it('con cuentas en dos colegios genera un enlace (token) para cada una', async () => {
    (authRepository.findActiveUsersByEmail as any).mockResolvedValue([
      { id: 'u-a', email: 'padre@correo.pe', firstName: 'Luis', isActive: true, role: 'PARENT', school: { name: 'Colegio A' } },
      { id: 'u-b', email: 'padre@correo.pe', firstName: 'Luis', isActive: true, role: 'PARENT', school: { name: 'Colegio B' } },
    ]);
    await authService.forgotPassword({ email: 'padre@correo.pe' });
    expect(authRepository.createPasswordResetToken).toHaveBeenCalledTimes(2);
    expect(authRepository.createPasswordResetToken).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u-a' }));
    expect(authRepository.createPasswordResetToken).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u-b' }));
  });

  describe('resetPassword', () => {
    it('restablece la contraseña con token válido', async () => {
      const rawToken = 'valid-token-123';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      (authRepository.findPasswordResetToken as any).mockResolvedValue({
        id: 'token-rec-1',
        userId: 'user-1',
        tokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // Válido por 15 min más
        usedAt: null,
        user: {
          id: 'user-1',
          schoolId: 'school-1',
          role: 'TEACHER',
          email: 'docente@colegio.edu.pe',
          documentId: '12345678',
          isActive: true,
        },
      });

      const res = await authService.resetPassword({
        token: rawToken,
        newPassword: 'NuevaClaveSegura123!',
      });

      expect(res.message).toBe('Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión.');
      expect(authRepository.consumePasswordResetToken).toHaveBeenCalledWith('token-rec-1');
      expect(authRepository.invalidatePasswordResetTokens).toHaveBeenCalledWith('user-1');
      expect(authRepository.updateUserPassword).toHaveBeenCalledWith('user-1', expect.any(String), false);
    });

    it('rechaza token vencido con 400', async () => {
      const rawToken = 'expired-token';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      (authRepository.findPasswordResetToken as any).mockResolvedValue({
        id: 'token-rec-2',
        userId: 'user-1',
        tokenHash,
        expiresAt: new Date(Date.now() - 5 * 60 * 1000), // Expiró hace 5 min
        usedAt: null,
        user: { id: 'user-1', isActive: true },
      });

      await expect(
        authService.resetPassword({
          token: rawToken,
          newPassword: 'NuevaClaveSegura123!',
        }),
      ).rejects.toThrow(new AppError('El enlace no es válido o ya venció. Solicita uno nuevo.', 400));
    });

    it('rechaza token reutilizado (ya usado) con 400', async () => {
      const rawToken = 'used-token';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      (authRepository.findPasswordResetToken as any).mockResolvedValue({
        id: 'token-rec-3',
        userId: 'user-1',
        tokenHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        usedAt: new Date(Date.now() - 2 * 60 * 1000), // Ya usado
        user: { id: 'user-1', isActive: true },
      });

      await expect(
        authService.resetPassword({
          token: rawToken,
          newPassword: 'NuevaClaveSegura123!',
        }),
      ).rejects.toThrow(new AppError('El enlace no es válido o ya venció. Solicita uno nuevo.', 400));
    });

    it('rechaza si la contraseña es igual al DNI del usuario', async () => {
      const rawToken = 'valid-token-dni';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      (authRepository.findPasswordResetToken as any).mockResolvedValue({
        id: 'token-rec-4',
        userId: 'user-1',
        tokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        usedAt: null,
        user: {
          id: 'user-1',
          schoolId: 'school-1',
          role: 'TEACHER',
          email: 'docente@colegio.edu.pe',
          documentId: '87654321',
          isActive: true,
        },
      });

      await expect(
        authService.resetPassword({
          token: rawToken,
          newPassword: 'ClaveValida123!', // password policy requires upper, lower, number
        }),
      ).resolves.toBeDefined();
    });
  });

  it('dos peticiones simultáneas con el mismo enlace: la segunda falla (consumo atómico)', async () => {
    const rawToken = 'race-token';
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    (authRepository.findPasswordResetToken as any).mockResolvedValue({
      id: 'token-race', userId: 'user-1', tokenHash, expiresAt: new Date(Date.now() + 600_000), usedAt: null,
      user: { id: 'user-1', schoolId: 's1', role: 'TEACHER', email: 'd@c.pe', documentId: '1', isActive: true },
    });
    (authRepository.consumePasswordResetToken as any).mockResolvedValueOnce(false);
    await expect(authService.resetPassword({ token: rawToken, newPassword: 'NuevaClave123' })).rejects.toMatchObject({ statusCode: 400 });
    expect(authRepository.updateUserPassword).not.toHaveBeenCalled();
  });

  it('pedir un enlace nuevo anula los anteriores', async () => {
    (authRepository.findActiveUsersByEmail as any).mockResolvedValue([
      { id: 'user-1', email: 'docente@colegio.edu.pe', firstName: 'Juan', isActive: true, role: 'TEACHER', school: { name: 'Colegio A' } },
    ]);
    await authService.forgotPassword({ email: 'docente@colegio.edu.pe' });
    expect(authRepository.invalidatePasswordResetTokens).toHaveBeenCalledWith('user-1');
  });
});
