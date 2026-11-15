import { prisma } from '../../config/prisma';
import type { User, Prisma, Role } from '@prisma/client';
import type { CreateUserDto, UpdateUserDto, UserFilterDto } from './user.schema';
import type { PaginatedResult } from '../../core/interfaces/global.interfaces';

const USER_PUBLIC_SELECT = {
  id: true,
  schoolId: true,
  email: true,
  role: true,
  financeRole: true,
  firstName: true,
  lastNamePaternal: true,
  lastNameMaternal: true,
  documentType: true,
  documentId: true,
  cellphone: true,
  educationLevel: true,
  isActive: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Omit<User, 'passwordHash' | 'lastSeenAt' | 'mustChangePassword' | 'passwordChangedAt' | 'failedLoginAttempts' | 'lockedUntil'>;

export class UserRepository {
  async findAllBySchool(
    schoolId: string,
    filters: Partial<UserFilterDto> & { actorRole?: Role; actorUserId?: string } = {},
  ): Promise<PaginatedResult<PublicUser>> {
    const { page = 1, limit = 500, role, roles, staffOnly, search, yearScope, staffYearId, actorRole, actorUserId } = filters;
    const skip = (page - 1) * limit;

    let roleFilter: Prisma.UserWhereInput['role'] = undefined;
    if (actorRole !== 'SUPER_ADMIN') {
      if (role) {
        roleFilter = role === 'SUPER_ADMIN' ? { in: [] } : role;
      } else if (roles) {
        const parsed = roles.split(',').map((r) => r.trim()).filter((r) => r && r !== 'SUPER_ADMIN') as Role[];
        roleFilter = { in: parsed };
      } else if (staffOnly) {
        roleFilter = { in: ['SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'] };
      } else {
        roleFilter = { not: 'SUPER_ADMIN' };
      }
    } else {
      if (role) {
        roleFilter = role;
      } else if (roles) {
        const parsed = roles.split(',').map((r) => r.trim()).filter(Boolean) as Role[];
        if (parsed.length > 0) {
          roleFilter = { in: parsed };
        }
      } else if (staffOnly) {
        roleFilter = { in: ['SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'] };
      }
    }

    let teacherTeacherFilter: Prisma.UserWhereInput | undefined = undefined;
    if (actorRole === 'TEACHER' && actorUserId) {
      const teacherClassrooms = await prisma.classroom.findMany({
        where: {
          schoolId,
          OR: [
            { tutorTeacherId: actorUserId },
            { years: { some: { tutorTeacherId: actorUserId, ...(staffYearId ? { academicYearId: staffYearId } : {}) } } },
            { assignments: { some: { teacherId: actorUserId, deletedAt: null, ...(staffYearId ? { academicYearId: staffYearId } : {}) } } },
          ],
        },
        select: { id: true },
      });
      const classroomIds = teacherClassrooms.map((c) => c.id);

      const parentRelations = await prisma.familyRelationship.findMany({
        where: {
          student: {
            schoolId,
            enrollments: {
              some: {
                classroomId: { in: classroomIds },
                isActive: true,
                ...(staffYearId ? { academicYearId: staffYearId } : {}),
              },
            },
          },
        },
        select: { userId: true },
      });
      const allowedParentUserIds = [...new Set(parentRelations.map((r) => r.userId))];

      teacherTeacherFilter = {
        OR: [
          { role: { in: ['SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'] } },
          { role: 'PARENT', id: { in: allowedParentUserIds } },
        ],
      };
    }

    const where: Prisma.UserWhereInput = {
      schoolId,
      ...(roleFilter ? { role: roleFilter } : {}),
      ...(teacherTeacherFilter ? teacherTeacherFilter : {}),
      // Personal contratado en el año elegido
      ...(yearScope === 'year' && staffYearId ? { staffYears: { some: { academicYearId: staffYearId } } } : {}),
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

    const [rawRows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          ...USER_PUBLIC_SELECT,
          ...(staffYearId ? { staffYears: { where: { academicYearId: staffYearId }, select: { position: true } } } : {}),
        },
        orderBy: [{ lastNamePaternal: 'asc' }, { firstName: 'asc' }],
      }),
      prisma.user.count({ where }),
    ]);

    const data: PublicUser[] =
      actorRole === 'TEACHER'
        ? rawRows.map((u) => ({
            ...u,
            documentId: '',
            cellphone: '',
            educationLevel: '',
          }))
        : rawRows;

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

  async findById(userId: string, schoolId: string, actorRole?: Role): Promise<PublicUser | null> {
    return prisma.user.findFirst({
      where: {
        id: userId,
        schoolId,
        ...(actorRole !== 'SUPER_ADMIN' ? { role: { not: 'SUPER_ADMIN' } } : {}),
      },
      select: USER_PUBLIC_SELECT,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findByDocumentId(schoolId: string, documentId: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { schoolId, documentId },
    });
  }

  async create(
    schoolId: string,
    data: CreateUserDto,
    passwordHash: string,
    mustChangePassword = true,
  ): Promise<PublicUser> {
    return prisma.user.create({
      data: {
        schoolId,
        email: data.email,
        passwordHash,
        mustChangePassword,
        firstName: data.firstName,
        lastNamePaternal: data.lastNamePaternal,
        lastNameMaternal: data.lastNameMaternal || '',
        role: data.role,
        documentType: data.documentType,
        documentId: data.documentId,
        cellphone: data.cellphone,
        educationLevel: data.educationLevel,
      },
      select: USER_PUBLIC_SELECT,
    });
  }

  async update(userId: string, schoolId: string, data: UpdateUserDto): Promise<PublicUser> {
    return prisma.user.update({
      where: { id: userId, schoolId },
      data: {
        ...data,
        lastNameMaternal: data.lastNameMaternal === null ? '' : data.lastNameMaternal,
      },
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

  async findByIdRaw(userId: string, schoolId: string, actorRole?: Role): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        id: userId,
        schoolId,
        ...(actorRole !== 'SUPER_ADMIN' ? { role: { not: 'SUPER_ADMIN' } } : {}),
      },
    });
  }

  async updatePassword(
    userId: string,
    schoolId: string,
    passwordHash: string,
    mustChangePassword = true,
  ): Promise<void> {
    await prisma.user.update({
      where: { id: userId, schoolId },
      data: {
        passwordHash,
        mustChangePassword,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }
}
