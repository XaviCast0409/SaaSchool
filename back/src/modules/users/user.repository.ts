import { prisma } from '../../config/prisma';
import { hashPassword } from '../../utils/hash.util';
import type { User, Prisma } from '@prisma/client';
import type { CreateUserDto, UpdateUserDto } from './user.schema';

/**
 * Select explícito de todos los campos públicos del modelo User.
 * Se usa en create/update donde Prisma v5 no soporta la opción `omit`.
 */
const USER_PUBLIC_SELECT = {
  id: true,
  schoolId: true,
  email: true,
  role: true,
  firstName: true,
  lastNamePaternal: true,
  lastNameMaternal: true,
  documentType: true,
  documentId: true,
  cellphone: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

type PublicUser = Omit<User, 'passwordHash'>;

export class UserRepository {
  async findAllBySchool(schoolId: string, role?: string): Promise<PublicUser[]> {
    return prisma.user.findMany({
      where: {
        schoolId,
        ...(role ? { role: role as User['role'] } : {}),
      },
      select: USER_PUBLIC_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(userId: string, schoolId: string): Promise<PublicUser | null> {
    return prisma.user.findFirst({
      where: { id: userId, schoolId },
      select: USER_PUBLIC_SELECT,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async create(schoolId: string, data: CreateUserDto): Promise<PublicUser> {
    const passwordHash = await hashPassword(data.password);

    return prisma.user.create({
      data: {
        schoolId,
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastNamePaternal: data.lastNamePaternal,
        lastNameMaternal: data.lastNameMaternal,
        role: data.role,
        documentType: data.documentType,
        documentId: data.documentId,
        cellphone: data.cellphone,
      },
      select: USER_PUBLIC_SELECT,
    });
  }

  async update(userId: string, schoolId: string, data: UpdateUserDto): Promise<PublicUser> {
    return prisma.user.update({
      where: { id: userId, schoolId },
      data,
      select: USER_PUBLIC_SELECT,
    });
  }

  async deactivate(userId: string, schoolId: string): Promise<PublicUser> {
    return prisma.user.update({
      where: { id: userId, schoolId },
      data: { isActive: false },
      select: USER_PUBLIC_SELECT,
    });
  }

  async reactivate(userId: string, schoolId: string): Promise<PublicUser> {
    return prisma.user.update({
      where: { id: userId, schoolId },
      data: { isActive: true },
      select: USER_PUBLIC_SELECT,
    });
  }
}
