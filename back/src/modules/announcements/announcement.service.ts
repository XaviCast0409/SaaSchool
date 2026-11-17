import { AppError } from '../../core/errors/app-error';
import { prisma } from '../../config/prisma';
import type { AnnouncementRepository } from './announcement.repository';
import type { CreateAnnouncementDto, UpdateAnnouncementDto, AnnouncementFilterDto } from './announcement.schema';
import type { Announcement, Role } from '@prisma/client';
import { deliver } from '../automations/delivery';
import { announcementEndsAt } from './announcement-status.rules';
import { announcementRecipients, enrichForViewer, visibilityWhere, type Viewer } from './announcement-responses.service';
import { assertTeacherAnnouncementAllowed } from './announcement-author.rules';

export class AnnouncementService {
  constructor(private readonly announcementRepository: AnnouncementRepository) {}

  private async validateTeacherAnnouncement(
    schoolId: string,
    teacherId: string,
    classroomId?: string | null,
    targetRoles?: Role[],
  ): Promise<void> {
    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      select: { id: true },
    });

    const teacherClassrooms = await prisma.classroom.findMany({
      where: {
        schoolId,
        OR: [
          { tutorTeacherId: teacherId },
          { years: { some: { tutorTeacherId: teacherId, ...(activeYear ? { academicYearId: activeYear.id } : {}) } } },
          { assignments: { some: { teacherId, deletedAt: null, ...(activeYear ? { academicYearId: activeYear.id } : {}) } } },
        ],
      },
      select: { id: true },
    });

    assertTeacherAnnouncementAllowed('TEACHER', teacherClassrooms.map((c) => c.id), classroomId, targetRoles);
  }

  async getAnnouncements(viewer: Viewer, filters: AnnouncementFilterDto) {
    const visibility = await visibilityWhere(viewer);
    const result = await this.announcementRepository.findAllBySchool(viewer.schoolId, viewer, filters, visibility);
    const data = await enrichForViewer(viewer, result.data);
    // endsAt: cuándo deja (o dejó) de estar vigente, para mostrar "Vence el…" / "Venció el…"
    return { ...result, data: data.map((a) => ({ ...a, endsAt: announcementEndsAt(a) })) };
  }

  /** Lectura por ID para cualquier rol: solo si está entre los destinatarios (o es el autor). */
  async getAnnouncementForViewer(viewer: Viewer, announcementId: string): Promise<Announcement> {
    const visibility = await visibilityWhere(viewer);
    const announcement = await this.announcementRepository.findVisibleById(announcementId, viewer.schoolId, viewer, visibility);
    if (!announcement) throw new AppError('Comunicado no encontrado.', 404);
    return announcement;
  }

  /** El aula de un comunicado tiene que ser del mismo colegio. */
  /**
   * Los adjuntos deben ser archivos de este colegio. Se marcan como SCHOOL_ASSET para que cualquier
   * familia o docente del colegio pueda abrirlos desde el comunicado (por defecto un archivo del
   * personal solo lo ve el personal).
   */
  private async prepareAttachments(schoolId: string, uploaderId: string, attachments?: Array<{ fileId: string }>): Promise<void> {
    if (!attachments?.length) return;
    const ids = [...new Set(attachments.map((a) => a.fileId))];
    // Solo archivos que subió quien publica y que no son privados de un alumno o de pagos:
    // así nadie puede volver público un voucher o una tarea adjuntando su id.
    const files = await prisma.storedFile.findMany({
      where: { id: { in: ids }, schoolId, deletedAt: null, uploadedById: uploaderId, purpose: { in: ['COURSE_MATERIAL', 'SCHOOL_ASSET', 'STAFF_RESOURCE'] } },
      select: { id: true },
    });
    if (files.length !== ids.length) throw new AppError('Solo puedes adjuntar archivos que subiste tú para este comunicado.', 400);
    await prisma.storedFile.updateMany({ where: { id: { in: ids }, schoolId }, data: { purpose: 'SCHOOL_ASSET' } });
  }

  private async assertClassroomInSchool(schoolId: string, classroomId?: string | null): Promise<void> {
    if (!classroomId) return;
    const found = await prisma.classroom.count({ where: { id: classroomId, schoolId } });
    if (!found) throw new AppError('Aula no encontrada.', 404);
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
    authorRole?: string,
  ): Promise<Announcement> {
    await this.assertClassroomInSchool(schoolId, createDto.classroomId);
    await this.prepareAttachments(schoolId, authorId, createDto.attachments);
    if (authorRole === 'TEACHER' && createDto.targetLevel) {
      throw new AppError('Los docentes publican para sus aulas; los comunicados por nivel o grado los publica la Dirección.', 403);
    }
    if (authorRole === 'TEACHER') {
      await this.validateTeacherAnnouncement(schoolId, authorId, createDto.classroomId, createDto.targetRoles);
    }
    const created = await this.announcementRepository.create(schoolId, authorId, createDto);

    // Avisar (app + push) solo a quienes corresponde: roles destino y, si es de un aula, solo sus familias.
    // En segundo plano: con cientos de familias los push tardan y el autor no tiene por qué esperar.
    void this.notifyNewAnnouncement(schoolId, created, createDto);
    return created;
  }

  private async notifyNewAnnouncement(schoolId: string, created: Announcement, createDto: CreateAnnouncementDto): Promise<void> {
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
  }

  async updateAnnouncement(
    announcementId: string,
    schoolId: string,
    updateDto: UpdateAnnouncementDto,
    editor?: { userId: string; role: string },
  ): Promise<Announcement> {
    const current = await this.getAnnouncementById(announcementId, schoolId);
    if (updateDto.classroomId !== undefined) await this.assertClassroomInSchool(schoolId, updateDto.classroomId);
    if (updateDto.attachments !== undefined) await this.prepareAttachments(schoolId, editor?.userId ?? current.authorId, updateDto.attachments);
    // Un docente solo puede modificar sus propios comunicados
    if (editor?.role === 'TEACHER') {
      if (current.authorId !== editor.userId) {
        throw new AppError('Solo puedes modificar tus propios comunicados.', 403);
      }
      const effectiveClassroomId = updateDto.classroomId !== undefined ? updateDto.classroomId : current.classroomId;
      const effectiveTargetRoles = updateDto.targetRoles !== undefined ? updateDto.targetRoles : (current.targetRoles as Role[]);
      await this.validateTeacherAnnouncement(schoolId, editor.userId, effectiveClassroomId, effectiveTargetRoles);
    }
    return this.announcementRepository.update(announcementId, schoolId, updateDto);
  }

  async deleteAnnouncement(
    announcementId: string,
    schoolId: string,
    editor?: { userId: string; role: string },
  ): Promise<Announcement> {
    const current = await this.getAnnouncementById(announcementId, schoolId);
    // Un docente solo puede eliminar sus propios comunicados
    if (editor?.role === 'TEACHER' && current.authorId !== editor.userId) {
      throw new AppError('Solo puedes eliminar tus propios comunicados.', 403);
    }
    return this.announcementRepository.softDelete(announcementId, schoolId);
  }
}
