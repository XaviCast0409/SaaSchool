import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../core/errors/app-error';
import { hashPassword, comparePassword } from '../../utils/hash.util';
import { signToken } from '../../utils/jwt.util';
import { sendEmail } from '../../utils/notification.util';
import { PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE } from '../../utils/password.util';
import { invalidatePrincipalCache, isStudentWithdrawn } from '../../core/security/principal-status';
import {
  buildOtpAuthUri,
  decryptTotpSecret,
  encryptTotpSecret,
  generateTotpSecret,
  verifyTotp,
} from '../../utils/totp.util';
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
    /** Solo SUPER_ADMIN: si ya tiene la verificación en dos pasos activa. */
    mfaEnabled?: boolean;
  };
}

type LoginCandidate = { kind: 'USER'; user: User } | { kind: 'STUDENT'; student: Student };

const candidateSchoolId = (c: LoginCandidate): string => (c.kind === 'USER' ? c.user.schoolId : c.student.schoolId);

const assertNotLocked = (lockedUntil: Date | null): void => {
  if (lockedUntil && lockedUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((lockedUntil.getTime() - Date.now()) / 60_000);
    throw new AppError(
      `Cuenta bloqueada temporalmente por intentos fallidos. Intenta nuevamente en ${minutes} minuto(s).`,
      423,
    );
  }
};

/** Escapa texto que se inserta en el HTML de un correo. */
const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const identifier = loginDto.email.trim();

    // Ingreso desde la página del colegio: la cuenta se busca solo dentro de ese colegio.
    // Sin código, el comportamiento es el de siempre (búsqueda en toda la plataforma).
    let schoolId: string | undefined = loginDto.schoolId;
    if (!schoolId && loginDto.schoolSlug) {
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

    const [users, students] = await Promise.all([
      loginDto.accountType === 'STUDENT' ? Promise.resolve([]) : this.authRepository.findUsersByIdentifier(identifier, schoolId),
      loginDto.accountType === 'USER' ? Promise.resolve([]) : this.authRepository.findStudentsByIdentifier(identifier, schoolId),
    ]);
    const candidates: LoginCandidate[] = [
      ...users.map((user) => ({ kind: 'USER' as const, user })),
      ...students.map((student) => ({ kind: 'STUDENT' as const, student })),
    ];

    if (candidates.length === 0) {
      await comparePassword(loginDto.password, DUMMY_HASH);
      throw new AppError('Credenciales inválidas', 401);
    }
    if (candidates.length === 1) return this.loginCandidate(candidates[0], loginDto);

    // La misma persona tiene cuenta en varios colegios (p. ej. un apoderado con hijos en dos colegios).
    // Solo cuentan las cuentas cuya contraseña coincide: así nadie descubre en qué colegios está registrada
    // una persona sin conocer su contraseña.
    const matching: LoginCandidate[] = [];
    for (const candidate of candidates) {
      const hash = candidate.kind === 'USER' ? candidate.user.passwordHash : candidate.student.passwordHash;
      const lockedUntil = candidate.kind === 'USER' ? candidate.user.lockedUntil : candidate.student.lockedUntil;
      if (!hash || (lockedUntil && lockedUntil.getTime() > Date.now())) continue;
      if (await comparePassword(loginDto.password, hash)) matching.push(candidate);
    }

    if (matching.length === 0) {
      await Promise.all(
        candidates.map((c) =>
          c.kind === 'USER'
            ? this.authRepository.registerFailedUserLogin(c.user.id, MAX_FAILED_ATTEMPTS, LOCK_MINUTES)
            : this.authRepository.registerFailedStudentLogin(c.student.id, MAX_FAILED_ATTEMPTS, LOCK_MINUTES),
        ),
      );
      throw new AppError('Credenciales inválidas', 401);
    }
    if (matching.length === 1) return this.loginCandidate(matching[0], loginDto);

    const schoolIds = [...new Set(matching.map(candidateSchoolId))];
    const schools = new Map((await this.authRepository.findSchoolsSummary(schoolIds)).map((s) => [s.id, s]));
    const options = matching.map((c) => {
      const school = schools.get(candidateSchoolId(c));
      return {
        schoolId: candidateSchoolId(c),
        schoolName: school?.name ?? 'Colegio',
        schoolSlug: school?.slug ?? null,
        logoUrl: school?.logoUrl ?? null,
        accountType: c.kind,
        role: c.kind === 'USER' ? c.user.role : 'STUDENT',
        name: c.kind === 'USER' ? c.user.firstName : c.student.firstNames,
      };
    });
    throw new AppError('Tienes cuenta en más de un colegio. Elige a cuál quieres entrar.', 409, true, 'SELECT_SCHOOL', { options });
  }

  private loginCandidate(candidate: LoginCandidate, loginDto: LoginDto): Promise<AuthResponse> {
    return candidate.kind === 'USER'
      ? this.loginUser(candidate.user, loginDto.password, loginDto.otp)
      : this.loginStudent(candidate.student, loginDto.password);
  }

  private async loginUser(user: User, password: string, otp?: string): Promise<AuthResponse> {
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
    if (user.role === 'SUPER_ADMIN') {
      await this.assertSuperAdminMfa(user, otp);
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
        ...(user.role === 'SUPER_ADMIN' && { mfaEnabled: Boolean(user.mfaEnabledAt) }),
      },
    };
  }

  /**
   * Segundo factor del SUPER_ADMIN (tiene acceso a todos los colegios).
   * Se pide después de validar la contraseña, para no revelar a terceros que la cuenta usa MFA.
   */
  private async assertSuperAdminMfa(user: User, otp?: string): Promise<void> {
    if (!user.mfaEnabledAt || !user.mfaSecret) {
      if (env.SUPERADMIN_REQUIRE_MFA === 'true') {
        throw new AppError(
          'Esta cuenta de soporte no tiene la verificación en dos pasos configurada. Restablécela con el script superadmin:create --reset-mfa.',
          403,
        );
      }
      return;
    }
    if (!otp) {
      throw new AppError('Ingresa el código de 6 dígitos de tu app de autenticación.', 401, true, 'MFA_REQUIRED');
    }
    const step = verifyTotp(decryptTotpSecret(user.mfaSecret), otp, user.mfaLastStep);
    if (step === null) {
      await this.authRepository.registerFailedUserLogin(user.id, MAX_FAILED_ATTEMPTS, LOCK_MINUTES);
      throw new AppError('El código de verificación no es válido o ya fue usado.', 401, true, 'MFA_INVALID');
    }
    // Compare-and-set: dos peticiones simultáneas con el mismo código no pueden pasar las dos
    const consumed = await prisma.user.updateMany({
      where: { id: user.id, OR: [{ mfaLastStep: null }, { mfaLastStep: { lt: step } }] },
      data: { mfaLastStep: step },
    });
    if (consumed.count === 0) {
      throw new AppError('El código de verificación no es válido o ya fue usado.', 401, true, 'MFA_INVALID');
    }
  }

  /** Genera un secreto TOTP nuevo (pendiente de confirmar) para el SUPER_ADMIN autenticado. */
  async startMfaSetup(principal: AuthenticatedUser): Promise<{ secret: string; otpauthUri: string }> {
    if (principal.role !== 'SUPER_ADMIN') throw new AppError('Solo disponible para cuentas de soporte.', 403);
    const user = await this.authRepository.findUserById(principal.userId);
    if (!user) throw new AppError('Usuario no encontrado', 404);
    if (user.mfaEnabledAt) {
      throw new AppError('La verificación en dos pasos ya está activa. Para cambiar de dispositivo, restablécela con el script.', 409);
    }
    const secret = generateTotpSecret();
    await prisma.user.update({
      where: { id: user.id },
      data: { mfaSecret: encryptTotpSecret(secret), mfaEnabledAt: null, mfaLastStep: null },
    });
    return { secret, otpauthUri: buildOtpAuthUri(secret, user.email ?? 'soporte') };
  }

  /** Confirma el secreto pendiente con un código válido y activa el MFA. */
  async confirmMfaSetup(principal: AuthenticatedUser, code: string): Promise<{ message: string }> {
    if (principal.role !== 'SUPER_ADMIN') throw new AppError('Solo disponible para cuentas de soporte.', 403);
    const user = await this.authRepository.findUserById(principal.userId);
    if (!user?.mfaSecret) throw new AppError('Primero genera el código QR.', 400);
    if (user.mfaEnabledAt) throw new AppError('La verificación en dos pasos ya está activa.', 409);
    const step = verifyTotp(decryptTotpSecret(user.mfaSecret), code);
    if (step === null) throw new AppError('El código no coincide. Revisa la hora de tu teléfono e inténtalo otra vez.', 400);
    await prisma.user.update({ where: { id: user.id }, data: { mfaEnabledAt: new Date(), mfaLastStep: step } });
    return { message: 'Verificación en dos pasos activada. Desde ahora se pedirá el código al ingresar.' };
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
    // Retirado o trasladado: se valida después de la contraseña para no revelar el estado a terceros
    if (await isStudentWithdrawn(student.id)) {
      throw new AppError('Tu matrícula figura como retirada o trasladada, por eso tu acceso fue cerrado. Comunícate con Secretaría.', 403);
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
    // Un mismo correo puede tener una cuenta por colegio: se envía un enlace para cada una
    const users = (await this.authRepository.findActiveUsersByEmail(cleanEmail)).filter((u) => u.email);

    if (users.length > 0) {
      const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
      const links: Array<{ schoolName: string; link: string }> = [];
      for (const user of users) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        await this.authRepository.createPasswordResetToken({
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutos
        });
        links.push({ schoolName: user.role === 'SUPER_ADMIN' ? 'KIPUX (soporte)' : user.school.name, link: `${frontendUrl}/restablecer?token=${rawToken}` });
      }

      const firstName = users[0].firstName;
      const several = links.length > 1;
      const textLinks = links.map((l) => (several ? `${l.schoolName}:\n${l.link}` : l.link)).join('\n\n');
      const htmlLinks = links
        .map(
          (l) => `
            <p style="margin: 20px 0 6px;">${several ? `<strong>${escapeHtml(l.schoolName)}</strong><br>` : ''}
              <a href="${l.link}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; margin-top: 8px;">Crear nueva contraseña</a>
            </p>
            <p style="color: #64748b; font-size: 12px; word-break: break-all;"><a href="${l.link}">${l.link}</a></p>`,
        )
        .join('');

      try {
        await sendEmail({
          to: users[0].email!,
          subject: 'Restablece tu contraseña - KIPUX',
          text: `Hola ${firstName},\n\nHemos recibido una solicitud para restablecer tu contraseña en KIPUX.\n${several ? 'Tienes una cuenta en cada uno de estos colegios; cada enlace cambia solo la contraseña de ese colegio:' : 'Haz clic en el siguiente enlace o cópialo en tu navegador para crear una nueva contraseña:'}\n\n${textLinks}\n\n${several ? 'Los enlaces expiran' : 'Este enlace expirará'} en 30 minutos y solo pueden usarse una vez.\nSi tú no solicitaste este cambio, puedes ignorar este mensaje de forma segura.\n\nAtentamente,\nEquipo KIPUX`,
          html: `<div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #1e3a8a;">Restablece tu contraseña</h2>
            <p>Hola <strong>${escapeHtml(firstName)}</strong>,</p>
            <p>Hemos recibido una solicitud para restablecer tu contraseña en KIPUX.</p>
            ${several ? '<p>Tienes una cuenta en cada uno de estos colegios. Cada enlace cambia solo la contraseña de ese colegio:</p>' : ''}
            ${htmlLinks}
            <p style="color: #64748b; font-size: 13px; margin-top: 24px;">${several ? 'Los enlaces expiran' : 'Este enlace expirará'} en 30 minutos y solo pueden usarse una vez. Si no solicitaste este cambio, ignora este correo.</p>
          </div>`,
        });
      } catch (err) {
        console.warn('[EMAIL ERROR] No se pudo enviar el correo de recuperación:', err);
      }
      // El enlace da acceso a la cuenta: nunca debe quedar en los logs de producción.
      if (env.NODE_ENV === 'development') {
        links.forEach((l) => console.log(`[RECUPERACIÓN DE CONTRASEÑA] ${l.schoolName}: ${l.link}`));
      }
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
