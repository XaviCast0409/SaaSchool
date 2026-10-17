import { AppError } from '../../core/errors/app-error';
import { prisma } from '../../config/prisma';
import type { AnnouncementRepository } from './announcement.repository';
import type { CreateAnnouncementDto, UpdateAnnouncementDto, AnnouncementFilterDto } from './announcement.schema';
import type { Announcement, Role } from '@prisma/client';
import type { PaginatedResult } from '../../core/interfaces/global.interfaces';

export class AnnouncementService {
  constructor(private readonly announcementRepository: AnnouncementRepository) {}

  async getAnnouncements(
    schoolId: string,
    userRole: Role,
    filters: AnnouncementFilterDto,
  ): Promise<PaginatedResult<Announcement>> {
    return this.announcementRepository.findAllBySchool(schoolId, userRole, filters);
  }

  async getAnnouncementById(announcementId: string, schoolId: string): Promise<Announcement> {
    const announcement = await this.announcementRepository.findById(announcementId, schoolId);

    if (!announcement) {
      throw new AppError(`Comunicado con ID ${announcementId} no encontrado`, 404);
    }

    return announcement;
  }

  async createAnnouncement(
    schoolId: string,
    authorId: string,
    createDto: CreateAnnouncementDto,
  ): Promise<Announcement> {
    const created = await this.announcementRepository.create(schoolId, authorId, createDto);

    try {
      const targetUsers = await prisma.user.findMany({
        where: {
          schoolId,
          isActive: true,
          role: { in: createDto.targetRoles },
          id: { not: authorId },
        },
        select: { id: true },
      });

      if (targetUsers.length > 0) {
        await prisma.notification.createMany({
          data: targetUsers.map((u) => ({
            schoolId,
            userId: u.id,
            title: `Nuevo Comunicado: ${createDto.title}`,
            message:
              createDto.content.length > 120
                ? `${createDto.content.substring(0, 117)}...`
                : createDto.content,
            type: 'ANNOUNCEMENT',
            link: '/announcements',
          })),
        });
      }
    } catch (notifErr) {
      console.error('Error generating announcement notifications:', notifErr);
    }

    return created;
  }

  async updateAnnouncement(
    announcementId: string,
    schoolId: string,
    updateDto: UpdateAnnouncementDto,
  ): Promise<Announcement> {
    await this.getAnnouncementById(announcementId, schoolId);
    return this.announcementRepository.update(announcementId, schoolId, updateDto);
  }

  async deleteAnnouncement(announcementId: string, schoolId: string): Promise<Announcement> {
    await this.getAnnouncementById(announcementId, schoolId);
    return this.announcementRepository.softDelete(announcementId, schoolId);
  }
}
