import { AppError } from '../../core/errors/app-error';
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
    return this.announcementRepository.create(schoolId, authorId, createDto);
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
