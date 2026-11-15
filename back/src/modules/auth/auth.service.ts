import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../core/errors/app-error';
import { hashPassword, comparePassword } from '../../utils/hash.util';
import { signToken } from '../../utils/jwt.util';
import { sendEmail } from '../../utils/notification.util';
import { PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE } from '../../utils/password.util';
import { invalidatePrincipalCache } from '../../core/security/principal-status';
import type { AuthRepository } from './auth.repository';
import type { LoginDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './auth.schema';
import type { User, Student } from '@prisma/client';
import type { AuthenticatedUser } from '../../core/interfaces/global.interfaces';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
// Hash ficticio para igualar el tiempo de respuesta cuando el usuario no existe (evita enumeración).
const DUMMY_HASH = bcrypt.hashSync('saaschool-dummy-password', 12);

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string | null;
    role: string;
    firstName: string;
    lastNamePaternal: string;
    schoolId: string;
    documentId?: string | null;
    mustChangePassword?: boolean;
    studentId?: string;
    avatarUrl?: string | null;
  };
}

const assertNotLocked = (lockedUntil: Date | null): void => {
  if (lockedUntil && lockedUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((lockedUntil.getTime() - Date.now()) / 60_000);
    throw new AppError(
      `Cuenta bloqueada temporalmente por intentos fallidos. Intenta nuevamente en ${minutes} minuto(s).`,
      423,
    );
  }
};

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const identifier = loginDto.email.trim();

    // Ingreso desde la página del colegio: la cuenta se busca solo dentro de ese colegio.
    // Sin código, el comportamiento es el de siempre (búsqueda en toda la plataforma).
    let schoolId: string | undefined;
    if (loginDto.schoolSlug) {
      const school = await this.authRepository.findSchoolBySlug(loginDto.schoolSlug);
      if (!school) throw new AppError('El código del colegio no es válido. Verifícalo con tu colegio.', 404);
      if (!school.isActive) {
        throw new AppError(
          'El acceso de tu colegio está suspendido. Comunícate con la dirección o con soporte de KIPUX.',
          403,
        );
      }
      schoolId = school.id;
    }

    const users = await this.authRepository.findUsersByIdentifier(identifier, schoolId);
    if (users.length > 1) {
      throw new AppError('Este documento está asociado a más de una cuenta. Ingresa con tu correo electrónico.', 409);
    }
    if (users[0]) {
      return this.loginUser(users[0], loginDto.password);
    }

    const students = await this.authRepository.findStudentsByIdentifier(identifier, schoolId);
    if (students.length > 1) {
      throw new AppError(
        'Este documento está registrado en más de un colegio. Ingresa con tu código de estudiante SIAGIE (14 dígitos).',
        409,
      );
    }
    if (!students[0]) {
      await comparePassword(loginDto.password, DUMMY_HASH);
      throw new AppError('Credenciales inválidas', 401);
    }
    return this.loginStudent(students[0], loginDto.password);
  }

  private async loginUser(user: User, password: string): Promise<AuthResponse> {
    if (!user.isActive) {
      throw new AppError('Tu cuenta está desactivada. Contacta al administrador.', 403);
    }
    if (user.role !== 'SUPER_ADMIN') {
      const school = await this.authRepository.findSchoolById(user.schoolId);
      if (school && !school.isActive) {
        throw new AppError(
          'El acceso de tu colegio está suspendido. Comunícate con la dirección o con soporte de KIPUX.',
          403,
        );
      }
    }
    assertNotLocked(user.lockedUntil);

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.authRepository.registerFailedUserLogin(user.id, MAX_FAILED_ATTEMPTS, LOCK_MINUTES);
      throw new AppError('Credenciales inválidas', 401);
    }
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.authRepository.resetUserLoginCounters(user.id);
    }

    const token = signToken({ userId: user.id, schoolId: user.schoolId, role: user.role, email: user.email });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastNamePaternal: user.lastNamePaternal,
        schoolId: user.schoolId,
        documentId: user.documentId,
        mustChangePassword: user.mustChangePassword,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  private async loginStudent(student: Student, password: string): Promise<AuthResponse> {
    const school = await this.authRepository.findSchoolById(student.schoolId);
    if (school && !school.isActive) {
      throw new AppError(
        'El acceso de tu colegio está suspendido. Comunícate con la dirección o con soporte de KIPUX.',
        403,
      );
    }

    if (!student.passwordHash) {
      throw new AppError(
        'Tu cuenta de estudiante aún no tiene contraseña. Solicita tus credenciales de acceso en Secretaría.',
        403,
      );
    }
    assertNotLocked(student.lockedUntil);

    const isPasswordValid = await comparePassword(password, student.passwordHash);
    if (!isPasswordValid) {
      await this.authRepository.registerFailedStudentLogin(student.id, MAX_FAILED_ATTEMPTS, LOCK_MINUTES);
      throw new AppError('Credenciales inválidas', 401);
    }
    if (student.failedLoginAttempts > 0 || student.lockedUntil) {
      await this.authRepository.resetStudentLoginCounters(student.id);
    }

    const login = student.studentCode || student.documentId;
    const token = signToken({
      userId: student.id,
      studentId: student.id,
      schoolId: student.schoolId,
      role: 'STUDENT',
      email: login,
    });

    return {
      token,
      user: {
        id: student.id,
        studentId: student.id,
        email: login,
        role: 'STUDENT',
        firstName: student.firstNames,
        lastNamePaternal: student.lastNamePaternal,
        schoolId: student.schoolId,
        documentId: student.documentId,
        mustChangePassword: student.mustChangePassword,
      },
    };
  }

  /** Cambia la contraseña y devuelve un token nuevo (el anterior queda invalidado). */
  async changePassword(
    principal: AuthenticatedUser,
    dto: ChangePasswordDto,
  ): Promise<{ message: string; token: string }> {
    if (principal.role === 'STUDENT') {
      const studentId = principal.studentId ?? principal.userId;
      const student = await this.authRepository.findStudentById(studentId);
      if (!student) throw new AppError('Estudiante no encontrado', 404);

      if (!student.mustChangePassword) {
        if (!dto.currentPassword) throw new AppError('Ingresa tu contraseña actual.', 400);
        const ok = student.passwordHash ? await comparePassword(dto.currentPassword, student.passwordHash) : false;
        if (!ok) throw new AppError('La contraseña actual ingresada es incorrecta', 400);
      }
      if (student.documentId && dto.newPassword.trim() === student.documentId.trim()) {
        throw new AppError('La nueva contraseña no puede ser igual a tu número de documento.', 400);
      }

      const hash = await hashPassword(dto.newPassword);
      await this.authRepository.updateStudentPassword(student.id, hash, false);
      invalidatePrincipalCache('student', student.id);

      const token = signToken({
        userId: student.id,
        studentId: student.id,
        schoolId: student.schoolId,
        role: 'STUDENT',
        email: student.studentCode || student.documentId,
      });
      return { message: 'Contraseña actualizada exitosamente', token };
    }

    const user = await this.authRepository.findUserById(principal.userId);
    if (!user) throw new AppError('Usuario no encontrado', 404);

    if (!user.mustChangePassword) {
      if (!dto.currentPassword) throw new AppError('Ingresa tu contraseña actual.', 400);
      const ok = await comparePassword(dto.currentPassword, user.passwordHash);
      if (!ok) throw new AppError('La contraseña actual ingresada es incorrecta', 400);
    }
    if (user.documentId && dto.newPassword.trim() === user.documentId.trim()) {
      throw new AppError('La nueva contraseña no puede ser igual a tu número de DNI.', 400);
    }

    const hash = await hashPassword(dto.newPassword);
    await this.authRepository.updateUserPassword(user.id, hash, false);
    invalidatePrincipalCache('user', user.id);

    const token = signToken({ userId: user.id, schoolId: user.schoolId, role: user.role, email: user.email });
    return { message: 'Contraseña actualizada exitosamente', token };
  }

  /**
   * Solicita restablecimiento de contraseña vía correo electrónico (P1).
   * Responde SIEMPRE con el mismo mensaje para evitar enumeración de usuarios.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const cleanEmail = dto.email.trim().toLowerCase();
    const user = await this.authRepository.findUserByEmail(cleanEmail);

    if (user && user.isActive && user.email) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

      await this.authRepository.createPasswordResetToken({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
      const resetLink = `${frontendUrl}/restablecer?token=${rawToken}`;

      try {
        await sendEmail({
          to: user.email,
          subject: 'Restablece tu contraseña - KIPUX',
          text: `Hola ${user.firstName},\n\nHemos recibido una solicitud para restablecer tu contraseña en KIPUX.\nHaz clic en el siguiente enlace o cópialo en tu navegador para crear una nueva contraseña:\n\n${resetLink}\n\nEste enlace expirará en 30 minutos y solo puede usarse una vez.\nSi tú no solicitaste este cambio, puedes ignorar este mensaje de forma segura.\n\nAtentamente,\nEquipo KIPUX`,
          html: `<div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #1e3a8a;">Restablece tu contraseña</h2>
            <p>Hola <strong>${user.firstName}</strong>,</p>
            <p>Hemos recibido una solicitud para restablecer tu contraseña en KIPUX.</p>
            <p style="margin: 24px 0;">
              <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Crear nueva contraseña</a>
            </p>
            <p style="color: #64748b; font-size: 13px;">O copia y pega este enlace en tu navegador:<br><a href="${resetLink}">${resetLink}</a></p>
            <p style="color: #64748b; font-size: 13px;">Este enlace expirará en 30 minutos y solo puede ser usado una sola vez. Si no solicitaste este cambio, ignora este correo.</p>
          </div>`,
        });
      } catch (err) {
        console.warn('[EMAIL ERROR] No se pudo enviar el correo de recuperación:', err);
      }
      console.log(`[RECUPERACIÓN DE CONTRASEÑA] Enlace para ${user.email}: ${resetLink}`);
    }

    return {
      message: 'Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.',
    };
  }

  /**
   * Restablece la contraseña de un usuario mediante token de un solo uso (P1).
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = crypto.createHash('sha256').update(dto.token.trim()).digest('hex');
    const record = await this.authRepository.findPasswordResetToken(tokenHash);

    if (!record || record.usedAt !== null || record.expiresAt.getTime() < Date.now()) {
      throw new AppError('El enlace no es válido o ya venció. Solicita uno nuevo.', 400);
    }

    const user = record.user;
    if (!user || !user.isActive) {
      throw new AppError('El enlace no es válido o ya venció. Solicita uno nuevo.', 400);
    }

    const cleanPassword = dto.newPassword.trim();
    if (!PASSWORD_POLICY_REGEX.test(cleanPassword)) {
      throw new AppError(PASSWORD_POLICY_MESSAGE, 422);
    }

    if (user.documentId && cleanPassword === user.documentId.trim()) {
      throw new AppError('La nueva contraseña no puede ser igual a tu número de documento.', 422);
    }

    const passwordHash = await hashPassword(cleanPassword);
    await this.authRepository.markPasswordResetTokenUsed(record.id);
    await this.authRepository.updateUserPassword(user.id, passwordHash, false);

    invalidatePrincipalCache('user', user.id);

    await prisma.auditLog.create({
      data: {
        schoolId: user.schoolId,
        actorId: user.id,
        actorRole: user.role,
        actorEmail: user.email,
        action: 'PASSWORD_RESET',
        entity: 'User',
        entityId: user.id,
        after: { method: 'SELF_SERVICE_TOKEN' },
      },
    }).catch(() => {});

    return {
      message: 'Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión.',
    };
  }
}
