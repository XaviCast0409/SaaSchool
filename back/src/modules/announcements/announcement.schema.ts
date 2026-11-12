import { z } from 'zod';
import { Role, AnnouncementPriority } from '@prisma/client';

const baseAnnouncementSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(200),
  content: z.string().min(5, 'El contenido debe tener al menos 5 caracteres'),
  priority: z.nativeEnum(AnnouncementPriority).default(AnnouncementPriority.NORMAL),
  targetRoles: z.array(z.nativeEnum(Role)).min(1, 'Debe especificar al menos un rol de destino'),
  classroomId: z.string().uuid('ID de aula inválido').optional(),
  expiresAt: z.string().datetime().optional().transform((val) => (val ? new Date(val) : undefined)),
  responseType: z.enum(['NONE', 'ACKNOWLEDGE', 'AUTHORIZATION', 'POLL']).default('NONE'),
  responseDeadline: z
    .string()
    .datetime()
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : null)),
  pollOptions: z.array(z.string().trim().min(1).max(80)).max(6).default([]),
});

const responseRules = <T extends { responseType?: string; pollOptions?: string[]; targetRoles?: string[] }>(v: T, ctx: z.RefinementCtx) => {
  if (v.responseType === 'POLL' && new Set(v.pollOptions ?? []).size < 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pollOptions'], message: 'La encuesta necesita al menos 2 opciones distintas.' });
  }
  if (v.responseType && v.responseType !== 'NONE' && v.targetRoles && !v.targetRoles.includes('PARENT')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['responseType'], message: 'Las respuestas solo aplican a comunicados dirigidos a apoderados.' });
  }
};

export const createAnnouncementSchema = baseAnnouncementSchema.superRefine(responseRules);

export const updateAnnouncementSchema = baseAnnouncementSchema
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .superRefine(responseRules);

export const respondAnnouncementSchema = z.object({
  studentId: z.string().uuid(),
  response: z.string().min(1).max(80),
  comment: z.string().max(500).optional(),
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
