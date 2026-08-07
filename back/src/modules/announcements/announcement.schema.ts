import { z } from 'zod';
import { Role, AnnouncementPriority } from '@prisma/client';

export const createAnnouncementSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(200),
  content: z.string().min(5, 'El contenido debe tener al menos 5 caracteres'),
  priority: z.nativeEnum(AnnouncementPriority).default(AnnouncementPriority.NORMAL),
  targetRoles: z.array(z.nativeEnum(Role)).min(1, 'Debe especificar al menos un rol de destino'),
  classroomId: z.string().uuid('ID de aula inválido').optional(),
  expiresAt: z.string().datetime().optional().transform((val) => (val ? new Date(val) : undefined)),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const announcementFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  priority: z.nativeEnum(AnnouncementPriority).optional(),
  classroomId: z.string().uuid().optional(),
});

export type CreateAnnouncementDto = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementDto = z.infer<typeof updateAnnouncementSchema>;
export type AnnouncementFilterDto = z.infer<typeof announcementFilterSchema>;
