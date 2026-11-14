import type { PlatformAnnouncement, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';

/** Roles de los colegios que pueden recibir un aviso de la plataforma (STUDENT = cuenta de alumno). */
export const ANNOUNCEMENT_AUDIENCES = ['SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT', 'STUDENT'] as const;

const announcementBase = z.object({
  title: z.string().trim().min(3, 'El título es muy corto').max(120),
  message: z.string().trim().min(1, 'Escribe el mensaje').max(2000),
  level: z.enum(['INFO', 'WARNING', 'CRITICAL']).default('INFO'),
  audience: z.array(z.enum(ANNOUNCEMENT_AUDIENCES)).min(1, 'Elige al menos a quién va dirigido'),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional(),
});

const endsAfterStart = (v: { startsAt?: Date; endsAt?: Date | null }) => !v.endsAt || !v.startsAt || v.endsAt > v.startsAt;
const endsAfterStartIssue = { message: 'La fecha de fin debe ser posterior al inicio', path: ['endsAt'] };

export const createAnnouncementSchema = announcementBase.refine(endsAfterStart, endsAfterStartIssue);
export const updateAnnouncementSchema = announcementBase.partial().refine(endsAfterStart, endsAfterStartIssue);

export type CreateAnnouncementDto = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementDto = z.infer<typeof updateAnnouncementSchema>;

/** ¿El aviso se está mostrando ahora mismo? */
export const isAnnouncementLive = (a: Pick<PlatformAnnouncement, 'isActive' | 'startsAt' | 'endsAt'>, now: Date = new Date()): boolean =>
  a.isActive && a.startsAt <= now && (!a.endsAt || a.endsAt > now);

/**
 * Avisos globales de la plataforma (mantenimiento, novedades) para todos los colegios.
 * Los publica SUPER_ADMIN; cada usuario ve solo los vigentes dirigidos a su rol.
 */
export class PlatformAnnouncementService {
  /** Avisos vigentes para un rol (lo consume el layout de todos los usuarios). */
  async activeFor(role: string, now: Date = new Date()): Promise<PlatformAnnouncement[]> {
    if (role === 'SUPER_ADMIN') return [];
    return prisma.platformAnnouncement.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        audience: { has: role },
      },
      orderBy: [{ level: 'desc' }, { startsAt: 'desc' }],
      take: 5,
    });
  }

  async list(): Promise<(PlatformAnnouncement & { isLive: boolean })[]> {
    const rows = await prisma.platformAnnouncement.findMany({ orderBy: { startsAt: 'desc' }, take: 100 });
    const now = new Date();
    return rows.map((a) => ({ ...a, isLive: isAnnouncementLive(a, now) }));
  }

  async create(dto: CreateAnnouncementDto, createdByEmail: string | null): Promise<PlatformAnnouncement> {
    return prisma.platformAnnouncement.create({
      data: {
        title: dto.title,
        message: dto.message,
        level: dto.level,
        audience: dto.audience,
        startsAt: dto.startsAt ?? new Date(),
        endsAt: dto.endsAt ?? null,
        isActive: dto.isActive ?? true,
        createdByEmail,
      },
    });
  }

  async update(id: string, dto: UpdateAnnouncementDto): Promise<PlatformAnnouncement> {
    const current = await prisma.platformAnnouncement.findUnique({ where: { id } });
    if (!current) throw new AppError('Aviso no encontrado', 404);

    const startsAt = dto.startsAt ?? current.startsAt;
    const endsAt = dto.endsAt === undefined ? current.endsAt : dto.endsAt;
    if (endsAt && endsAt <= startsAt) throw new AppError('La fecha de fin debe ser posterior al inicio', 422);

    const data: Prisma.PlatformAnnouncementUpdateInput = { ...dto };
    return prisma.platformAnnouncement.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    const current = await prisma.platformAnnouncement.findUnique({ where: { id }, select: { id: true } });
    if (!current) throw new AppError('Aviso no encontrado', 404);
    await prisma.platformAnnouncement.delete({ where: { id } });
  }
}
