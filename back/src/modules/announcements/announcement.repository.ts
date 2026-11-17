import { prisma } from '../../config/prisma';
import type { Announcement, Prisma, Role } from '@prisma/client';
import type { CreateAnnouncementDto, UpdateAnnouncementDto, AnnouncementFilterDto } from './announcement.schema';
import type { PaginatedResult } from '../../core/interfaces/global.interfaces';
import { statusWhere } from './announcement-status.rules';

/**
 * A quién va dirigido: Dirección ve todo; el resto, lo dirigido a su rol (los alumnos, lo de sus familias)
 * y siempre lo que publicó uno mismo, aunque no se haya incluido entre los destinatarios.
 */
export function audienceWhere(viewer: { role: string; userId: string }): Prisma.AnnouncementWhereInput {
  if (viewer.role === 'SUPER_ADMIN' || viewer.role === 'SCHOOL_ADMIN') return {};
  const targetRole = (viewer.role === 'STUDENT' ? 'PARENT' : viewer.role) as Role;
  return { OR: [{ targetRoles: { has: targetRole } }, { authorId: viewer.userId }] };
}

const ANNOUNCEMENT_INCLUDE = {
  author: { select: { id: true, firstName: true, lastNamePaternal: true, role: true } },
  classroom: { select: { id: true, grade: true, section: true, educationLevel: true } },
} as const;

export class AnnouncementRepository {
  async findAllBySchool(
    schoolId: string,
    viewer: { role: string; userId: string },
    filters: AnnouncementFilterDto,
    visibility: Prisma.AnnouncementWhereInput = {},
  ): Promise<PaginatedResult<Announcement>> {
    const { page, limit, search, priority, classroomId, status } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.AnnouncementWhereInput = {
      schoolId,
      isActive: true,
      // En AND para no chocar con el OR de la búsqueda
      AND: [audienceWhere(viewer), visibility, statusWhere(status)],
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
        include: ANNOUNCEMENT_INCLUDE,
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
      include: ANNOUNCEMENT_INCLUDE,
    });
  }

  /** Un comunicado solo si quien lo pide está entre sus destinatarios (mismas reglas que el listado). */
  async findVisibleById(
    announcementId: string,
    schoolId: string,
    viewer: { role: string; userId: string },
    visibility: Prisma.AnnouncementWhereInput,
  ): Promise<Announcement | null> {
    return prisma.announcement.findFirst({
      where: { id: announcementId, schoolId, isActive: true, AND: [audienceWhere(viewer), visibility] },
      include: ANNOUNCEMENT_INCLUDE,
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
        targetLevel: data.classroomId ? null : data.targetLevel ?? null,
        targetGrade: data.classroomId || !data.targetLevel ? null : data.targetGrade ?? null,
        expiresAt: data.expiresAt,
        responseType: data.responseType,
        responseDeadline: data.responseDeadline,
        pollOptions: data.responseType === 'POLL' ? [...new Set(data.pollOptions)] : [],
        attachments: data.attachments ?? [],
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
