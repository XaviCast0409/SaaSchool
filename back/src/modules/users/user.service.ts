import { AppError } from '../../core/errors/app-error';
import { hashPassword } from '../../utils/hash.util';
import { generateTemporaryPassword } from '../../utils/password.util';
import { invalidatePrincipalCache } from '../../core/security/principal-status';
import type { UserRepository, PublicUser } from './user.repository';
import type { CreateUserDto, UpdateUserDto, UserFilterDto } from './user.schema';
import type { Role } from '@prisma/client';
import type { PaginatedResult } from '../../core/interfaces/global.interfaces';

export interface UserActorContext {
  role: Role;
  userId: string;
}

export function canManage(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === 'SUPER_ADMIN') {
    return true;
  }
  if (actorRole === 'SCHOOL_ADMIN') {
    return targetRole !== 'SUPER_ADMIN';
  }
  if (actorRole === 'ADMINISTRATIVE') {
    return targetRole === 'TEACHER' || targetRole === 'PARENT';
  }
  return false;
}

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getAllUsers(
    schoolId: string,
    filters: Partial<UserFilterDto> & { actorRole?: Role; actorUserId?: string } = {},
  ): Promise<PaginatedResult<PublicUser>> {
    return this.userRepository.findAllBySchool(schoolId, filters);
  }

  async getUserById(
    userId: string,
    schoolId: string,
    actorRole?: Role,
    actorUserId?: string,
  ): Promise<PublicUser> {
    const user = await this.userRepository.findById(userId, schoolId, actorRole, actorUserId);

    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    if (user.role === 'SUPER_ADMIN' && actorRole !== 'SUPER_ADMIN') {
      throw new AppError('Usuario no encontrado', 404);
    }

    return user;
  }

  async createUser(
    schoolId: string,
    createUserDto: CreateUserDto,
    actor?: UserActorContext,
  ): Promise<PublicUser & { temporaryPassword: string | null }> {
    if (actor && !canManage(actor.role, createUserDto.role)) {
      throw new AppError('No tienes permiso para crear usuarios con este rol.', 403);
    }

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
    actor?: UserActorContext,
  ): Promise<PublicUser> {
    const target = await this.userRepository.findByIdRaw(userId, schoolId);
    if (!target) {
      throw new AppError('Usuario no encontrado', 404);
    }

    if (target.role === 'SUPER_ADMIN' && actor?.role !== 'SUPER_ADMIN') {
      throw new AppError('Usuario no encontrado', 404);
    }

    if (actor && !canManage(actor.role, target.role)) {
      throw new AppError('No tienes permiso para gestionar a este usuario.', 403);
    }

    if (updateUserDto.role !== undefined) {
      if (actor && actor.userId === userId) {
        throw new AppError('No puedes cambiar tu propio rol.', 403);
      }
      if (actor && actor.role !== 'SUPER_ADMIN' && actor.role !== 'SCHOOL_ADMIN') {
        throw new AppError('No tienes permiso para cambiar roles.', 403);
      }
      if (actor && !canManage(actor.role, updateUserDto.role)) {
        throw new AppError('No tienes permiso para asignar este rol.', 403);
      }
    }

    const user = await this.userRepository.update(userId, schoolId, updateUserDto);
    if (updateUserDto.role !== undefined) {
      invalidatePrincipalCache('user', userId);
    }
    return user;
  }

  async deactivateUser(
    userId: string,
    schoolId: string,
    actor?: UserActorContext,
  ): Promise<PublicUser> {
    const target = await this.userRepository.findByIdRaw(userId, schoolId);
    if (!target) {
      throw new AppError('Usuario no encontrado', 404);
    }

    if (target.role === 'SUPER_ADMIN' && actor?.role !== 'SUPER_ADMIN') {
      throw new AppError('Usuario no encontrado', 404);
    }

    if (actor && !canManage(actor.role, target.role)) {
      throw new AppError('No tienes permiso para gestionar a este usuario.', 403);
    }

    if (actor && actor.userId === userId) {
      throw new AppError('No puedes desactivar tu propia cuenta.', 400);
    }

    const user = await this.userRepository.deactivate(userId, schoolId);
    invalidatePrincipalCache('user', userId);
    return user;
  }

  async reactivateUser(
    userId: string,
    schoolId: string,
    actor?: UserActorContext,
  ): Promise<PublicUser> {
    const target = await this.userRepository.findByIdRaw(userId, schoolId);
    if (!target) {
      throw new AppError('Usuario no encontrado', 404);
    }

    if (target.role === 'SUPER_ADMIN' && actor?.role !== 'SUPER_ADMIN') {
      throw new AppError('Usuario no encontrado', 404);
    }

    if (actor && !canManage(actor.role, target.role)) {
      throw new AppError('No tienes permiso para gestionar a este usuario.', 403);
    }

    const user = await this.userRepository.reactivate(userId, schoolId);
    invalidatePrincipalCache('user', userId);
    return user;
  }

  async resetPassword(
    userId: string,
    schoolId: string,
    newPassword?: string,
    actor?: UserActorContext,
  ): Promise<{ message: string; temporaryPassword: string }> {
    const target = await this.userRepository.findByIdRaw(userId, schoolId);
    if (!target) {
      throw new AppError('Usuario no encontrado', 404);
    }

    if (target.role === 'SUPER_ADMIN' && actor?.role !== 'SUPER_ADMIN') {
      throw new AppError('Usuario no encontrado', 404);
    }

    if (actor && !canManage(actor.role, target.role)) {
      throw new AppError('No tienes permiso para gestionar a este usuario.', 403);
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
