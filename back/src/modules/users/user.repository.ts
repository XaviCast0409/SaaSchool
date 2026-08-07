import { prisma } from '../../config/prisma';
import { hashPassword } from '../../utils/hash.util';
import type { User, Prisma } from '@prisma/client';
import type { CreateUserDto, UpdateUserDto, UserFilterDto } from './user.schema';
import type { PaginatedResult } from '../../core/interfaces/global.interfaces';

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
  async findAllBySchool(
    schoolId: string,
    filters: UserFilterDto = { page: 1, limit: 10 },
  ): Promise<PaginatedResult<PublicUser>> {
    const { page, limit, role, search } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      schoolId,
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastNamePaternal: { contains: search, mode: 'insensitive' } },
              { lastNameMaternal: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { documentId: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: USER_PUBLIC_SELECT,
        orderBy: [{ lastNamePaternal: 'asc' }, { firstName: 'asc' }],
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
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
