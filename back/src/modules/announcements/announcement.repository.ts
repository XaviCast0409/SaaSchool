import { prisma } from '../../config/prisma';
import type { Announcement, Prisma, Role } from '@prisma/client';
import type { CreateAnnouncementDto, UpdateAnnouncementDto, AnnouncementFilterDto } from './announcement.schema';
import type { PaginatedResult } from '../../core/interfaces/global.interfaces';

export class AnnouncementRepository {
  async findAllBySchool(
    schoolId: string,
    userRole: Role,
    filters: AnnouncementFilterDto,
  ): Promise<PaginatedResult<Announcement>> {
    const { page, limit, search, priority, classroomId } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.AnnouncementWhereInput = {
      schoolId,
      isActive: true,
      ...(userRole !== 'SUPER_ADMIN' && userRole !== 'SCHOOL_ADMIN'
        ? { targetRoles: { has: userRole } }
        : {}),
      ...(priority ? { priority } : {}),
      ...(classroomId ? { classroomId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { content: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastNamePaternal: true,
              role: true,
            },
          },
          classroom: {
            select: {
              id: true,
              grade: true,
              section: true,
              educationLevel: true,
            },
          },
        },
      }),
      prisma.announcement.count({ where }),
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

  async findById(announcementId: string, schoolId: string): Promise<Announcement | null> {
    return prisma.announcement.findFirst({
      where: { id: announcementId, schoolId, isActive: true },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastNamePaternal: true,
            role: true,
          },
        },
        classroom: {
          select: {
            id: true,
            grade: true,
            section: true,
            educationLevel: true,
          },
        },
      },
    });
  }

  async create(
    schoolId: string,
    authorId: string,
    data: CreateAnnouncementDto,
  ): Promise<Announcement> {
    return prisma.announcement.create({
      data: {
        schoolId,
        authorId,
        title: data.title,
        content: data.content,
        priority: data.priority,
        targetRoles: data.targetRoles,
        classroomId: data.classroomId,
        expiresAt: data.expiresAt,
      },
    });
  }

  async update(
    announcementId: string,
    schoolId: string,
    data: UpdateAnnouncementDto,
  ): Promise<Announcement> {
    return prisma.announcement.update({
      where: { id: announcementId, schoolId },
      data,
    });
  }

  async softDelete(announcementId: string, schoolId: string): Promise<Announcement> {
    return prisma.announcement.update({
      where: { id: announcementId, schoolId },
      data: { isActive: false },
    });
  }
}
