import { AppError } from '../../core/errors/app-error';
import { hashPassword } from '../../utils/hash.util';
import { generateTemporaryPassword } from '../../utils/password.util';
import { invalidatePrincipalCache } from '../../core/security/principal-status';
import type { UserRepository } from './user.repository';
import type { CreateUserDto, UpdateUserDto, UserFilterDto } from './user.schema';
import type { User } from '@prisma/client';
import type { PaginatedResult } from '../../core/interfaces/global.interfaces';

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getAllUsers(
    schoolId: string,
    filters: Partial<UserFilterDto> = {},
  ): Promise<PaginatedResult<Omit<User, 'passwordHash'>>> {
    return this.userRepository.findAllBySchool(schoolId, filters);
  }

  async getUserById(userId: string, schoolId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.userRepository.findById(userId, schoolId);

    if (!user) {
      throw new AppError(`Usuario con id ${userId} no encontrado`, 404);
    }

    return user;
  }

  async createUser(
    schoolId: string,
    createUserDto: CreateUserDto,
  ): Promise<Omit<User, 'passwordHash'> & { temporaryPassword: string | null }> {
    if (createUserDto.email) {
      const existingEmail = await this.userRepository.findByEmail(createUserDto.email);
      if (existingEmail) {
        throw new AppError(
          `El correo electrónico "${createUserDto.email}" ya está registrado a nombre de ${existingEmail.firstName} ${existingEmail.lastNamePaternal}.`,
          409,
        );
      }
    }

    if (createUserDto.documentId) {
      const existingDoc = await this.userRepository.findByDocumentId(schoolId, createUserDto.documentId);
      if (existingDoc) {
        throw new AppError(
          `El DNI/Documento "${createUserDto.documentId}" ya se encuentra registrado para ${existingDoc.firstName} ${existingDoc.lastNamePaternal}.`,
          409,
        );
      }
    }

    const temporaryPassword = createUserDto.password ? null : generateTemporaryPassword();
    const passwordToHash = createUserDto.password ?? temporaryPassword!;
    const passwordHash = await hashPassword(passwordToHash);
    const user = await this.userRepository.create(schoolId, createUserDto, passwordHash, true);

    return { ...user, temporaryPassword };
  }

  async updateUser(
    userId: string,
    schoolId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    await this.getUserById(userId, schoolId);
    const user = await this.userRepository.update(userId, schoolId, updateUserDto);
    if (updateUserDto.role !== undefined) {
      invalidatePrincipalCache('user', userId);
    }
    return user;
  }

  async deactivateUser(
    userId: string,
    schoolId: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    await this.getUserById(userId, schoolId);
    const user = await this.userRepository.deactivate(userId, schoolId);
    invalidatePrincipalCache('user', userId);
    return user;
  }

  async reactivateUser(
    userId: string,
    schoolId: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    await this.getUserById(userId, schoolId);
    const user = await this.userRepository.reactivate(userId, schoolId);
    invalidatePrincipalCache('user', userId);
    return user;
  }

  async resetPassword(
    userId: string,
    schoolId: string,
    newPassword?: string,
  ): Promise<{ message: string; temporaryPassword: string }> {
    const user = await this.userRepository.findByIdRaw(userId, schoolId);
    if (!user) {
      throw new AppError(`Usuario con id ${userId} no encontrado`, 404);
    }

    const temporaryPassword = newPassword?.trim() || generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    await this.userRepository.updatePassword(userId, schoolId, passwordHash, true);
    invalidatePrincipalCache('user', userId);

    return {
      message: 'Contraseña restablecida. Entrega la contraseña temporal al usuario.',
      temporaryPassword,
    };
  }
}
