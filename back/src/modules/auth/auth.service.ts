import { AppError } from '../../core/errors/app-error';
import { hashPassword, comparePassword } from '../../utils/hash.util';
import { signToken } from '../../utils/jwt.util';
import type { AuthRepository } from './auth.repository';
import type { LoginDto, RegisterDto } from './auth.schema';

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastNamePaternal: string;
    schoolId: string;
  };
}

/**
 * AuthService: Lógica de negocio para autenticación.
 * Recibe su repositorio por inyección de dependencias en el constructor.
 */
export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const existingUser = await this.authRepository.findUserByEmail(loginDto.email);

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
      },
    };
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
