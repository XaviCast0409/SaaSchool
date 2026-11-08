import { AppError } from '../../core/errors/app-error';
import { hashPassword } from '../../utils/hash.util';
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
  ): Promise<Omit<User, 'passwordHash'>> {
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

    return this.userRepository.create(schoolId, createUserDto);
  }

  async updateUser(
    userId: string,
    schoolId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    await this.getUserById(userId, schoolId);
    return this.userRepository.update(userId, schoolId, updateUserDto);
  }

  async deactivateUser(
    userId: string,
    schoolId: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    await this.getUserById(userId, schoolId);
    return this.userRepository.deactivate(userId, schoolId);
  }

  async reactivateUser(
    userId: string,
    schoolId: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    await this.getUserById(userId, schoolId);
    return this.userRepository.reactivate(userId, schoolId);
  }

  async resetPassword(
    userId: string,
    schoolId: string,
    newPassword?: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findByIdRaw(userId, schoolId);
    if (!user) {
      throw new AppError(`Usuario con id ${userId} no encontrado`, 404);
    }

    const targetPassword = newPassword?.trim() || user.documentId?.trim();
    if (!targetPassword) {
      throw new AppError(
        'El usuario no cuenta con número de documento registrado para usar como contraseña.',
        400,
      );
    }

    const passwordHash = await hashPassword(targetPassword);
    await this.userRepository.updatePassword(userId, schoolId, passwordHash);

    return { message: 'Contraseña restablecida correctamente al número de documento' };
  }
}
