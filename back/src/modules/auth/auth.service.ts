import { AppError } from '../../core/errors/app-error';
import { hashPassword, comparePassword } from '../../utils/hash.util';
import { signToken } from '../../utils/jwt.util';
import type { AuthRepository } from './auth.repository';
import type { LoginDto, RegisterDto, ChangePasswordDto } from './auth.schema';

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastNamePaternal: string;
    schoolId: string;
    documentId?: string | null;
    mustChangePassword?: boolean;
  };
}

/**
 * AuthService: Lógica de negocio para autenticación.
 * Recibe su repositorio por inyección de dependencias en el constructor.
 */
export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const existingUser = await this.authRepository.findUserByIdentifier(loginDto.email);

    if (!existingUser) {
      throw new AppError('Credenciales inválidas', 401);
    }

    if (!existingUser.isActive) {
      throw new AppError('Tu cuenta está desactivada. Contacta al administrador.', 403);
    }

    const isPasswordValid = await comparePassword(loginDto.password, existingUser.passwordHash);

    if (!isPasswordValid) {
      throw new AppError('Credenciales inválidas', 401);
    }

    // Detectar si el usuario es un apoderado usando su DNI como contraseña inicial temporal
    let mustChangePassword = false;
    if (existingUser.role === 'PARENT' && existingUser.documentId) {
      const isInitialDniPassword = await comparePassword(existingUser.documentId, existingUser.passwordHash);
      if (isInitialDniPassword) {
        mustChangePassword = true;
      }
    }

    const token = signToken({
      userId: existingUser.id,
      schoolId: existingUser.schoolId,
      role: existingUser.role,
      email: existingUser.email,
    });

    return {
      token,
      user: {
        id: existingUser.id,
        email: existingUser.email,
        role: existingUser.role,
        firstName: existingUser.firstName,
        lastNamePaternal: existingUser.lastNamePaternal,
        schoolId: existingUser.schoolId,
        documentId: existingUser.documentId,
        mustChangePassword,
      },
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    if (changePasswordDto.currentPassword) {
      const isCurrentValid = await comparePassword(changePasswordDto.currentPassword, user.passwordHash);
      if (!isCurrentValid) {
        throw new AppError('La contraseña actual ingresada es incorrecta', 400);
      }
    }

    // Seguridad: la nueva contraseña no puede ser idéntica al número de DNI
    if (user.documentId && changePasswordDto.newPassword.trim() === user.documentId.trim()) {
      throw new AppError('La nueva contraseña no puede ser idéntica a tu número de DNI por motivos de seguridad.', 400);
    }

    const newPasswordHash = await hashPassword(changePasswordDto.newPassword);
    await this.authRepository.updatePassword(userId, newPasswordHash);

    return { message: 'Contraseña actualizada exitosamente' };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const existingUser = await this.authRepository.findUserByEmail(registerDto.email);

    if (existingUser) {
      throw new AppError('Ya existe un usuario con ese email', 409);
    }

    const passwordHash = await hashPassword(registerDto.password);

    const newUser = await this.authRepository.createUser({
      ...registerDto,
      passwordHash,
    });

    const token = signToken({
      userId: newUser.id,
      schoolId: newUser.schoolId,
      role: newUser.role,
      email: newUser.email,
    });

    return {
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        firstName: newUser.firstName,
        lastNamePaternal: newUser.lastNamePaternal,
        schoolId: newUser.schoolId,
      },
    };
  }
}
