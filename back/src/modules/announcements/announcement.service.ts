import { AppError } from '../../core/errors/app-error';
import { prisma } from '../../config/prisma';
import type { AnnouncementRepository } from './announcement.repository';
import type { CreateAnnouncementDto, UpdateAnnouncementDto, AnnouncementFilterDto } from './announcement.schema';
import type { Announcement, Role } from '@prisma/client';
import { deliver } from '../automations/delivery';
import { announcementEndsAt } from './announcement-status.rules';
import { announcementRecipients, enrichForViewer, visibilityWhere, type Viewer } from './announcement-responses.service';

export class AnnouncementService {
  constructor(private readonly announcementRepository: AnnouncementRepository) {}

  async getAnnouncements(viewer: Viewer, filters: AnnouncementFilterDto) {
    const visibility = await visibilityWhere(viewer);
    const result = await this.announcementRepository.findAllBySchool(viewer.schoolId, viewer.role as Role, filters, visibility);
    const data = await enrichForViewer(viewer, result.data);
    // endsAt: cuándo deja (o dejó) de estar vigente, para mostrar "Vence el…" / "Venció el…"
    return { ...result, data: data.map((a) => ({ ...a, endsAt: announcementEndsAt(a) })) };
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

    // Avisar (app + push) solo a quienes corresponde: roles destino y, si es de un aula, solo sus familias
    try {
      const recipients = await announcementRecipients(created);
      if (recipients.length > 0) {
        const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
        const needsAnswer = createDto.responseType && createDto.responseType !== 'NONE';
        await deliver(
          schoolId,
          recipients.map((userId) => ({ userId })),
          {
            title: `${needsAnswer ? 'Requiere respuesta: ' : 'Nuevo comunicado: '}${createDto.title}`,
            message: createDto.content.length > 120 ? `${createDto.content.substring(0, 117)}...` : createDto.content,
            type: 'ANNOUNCEMENT',
            link: '/announcements',
          },
          { schoolName: school?.name ?? '' },
        );
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
    editor?: { userId: string; role: string },
  ): Promise<Announcement> {
    const current = await this.getAnnouncementById(announcementId, schoolId);
    // Un docente solo puede modificar sus propios comunicados
    if (editor?.role === 'TEACHER' && current.authorId !== editor.userId) {
      throw new AppError('Solo puedes modificar tus propios comunicados.', 403);
    }
    return this.announcementRepository.update(announcementId, schoolId, updateDto);
  }

  async deleteAnnouncement(announcementId: string, schoolId: string): Promise<Announcement> {
    await this.getAnnouncementById(announcementId, schoolId);
    return this.announcementRepository.softDelete(announcementId, schoolId);
  }
}
