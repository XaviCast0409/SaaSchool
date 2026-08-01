import { AppError } from '../../core/errors/app-error';
import type { UserRepository } from './user.repository';
import type { CreateUserDto, UpdateUserDto } from './user.schema';
import type { User } from '@prisma/client';

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getAllUsers(schoolId: string, role?: string): Promise<Omit<User, 'passwordHash'>[]> {
    return this.userRepository.findAllBySchool(schoolId, role);
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
}
