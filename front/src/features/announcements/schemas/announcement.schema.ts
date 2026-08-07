import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(200),
  content: z.string().min(5, 'El contenido debe tener al menos 5 caracteres'),
  priority: z.enum(['NORMAL', 'IMPORTANT', 'URGENT']).default('NORMAL'),
  targetRoles: z.array(z.enum(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT'])).min(1, 'Selecciona al menos un destinatario'),
  classroomId: z.string().uuid().optional().or(z.literal('')),
  expiresAt: z.string().optional().or(z.literal('')),
});

export type CreateAnnouncementFormData = z.infer<typeof createAnnouncementSchema>;
