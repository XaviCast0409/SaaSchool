import bcrypt from 'bcryptjs';
import { AppError } from '../../core/errors/app-error';
import { hashPassword, comparePassword } from '../../utils/hash.util';
import { signToken } from '../../utils/jwt.util';
import { invalidatePrincipalCache } from '../../core/security/principal-status';
import type { AuthRepository } from './auth.repository';
import type { LoginDto, ChangePasswordDto } from './auth.schema';
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

    const users = await this.authRepository.findUsersByIdentifier(identifier);
    if (users.length > 1) {
      throw new AppError('Este documento está asociado a más de una cuenta. Ingresa con tu correo electrónico.', 409);
    }
    if (users[0]) {
      return this.loginUser(users[0], loginDto.password);
    }

    const students = await this.authRepository.findStudentsByIdentifier(identifier);
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
      },
    };
  }

  private async loginStudent(student: Student, password: string): Promise<AuthResponse> {
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
}
