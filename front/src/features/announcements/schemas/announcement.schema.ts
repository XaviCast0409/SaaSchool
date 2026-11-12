import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(200),
  content: z.string().min(5, 'El contenido debe tener al menos 5 caracteres'),
  priority: z.enum(['NORMAL', 'IMPORTANT', 'URGENT']).default('NORMAL'),
  targetRoles: z.array(z.enum(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT'])).min(1, 'Selecciona al menos un destinatario'),
  classroomId: z.string().uuid().optional().or(z.literal('')),
  expiresAt: z.string().optional().or(z.literal('')),
  responseType: z.enum(['NONE', 'ACKNOWLEDGE', 'AUTHORIZATION', 'POLL']).default('NONE'),
  responseDeadline: z.string().optional().or(z.literal('')),
  pollOptionsText: z.string().optional(),
}).superRefine((v, ctx) => {
  const options = parsePollOptions(v.pollOptionsText);
  if (v.responseType === 'POLL' && options.length < 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pollOptionsText'], message: 'Escribe al menos 2 opciones, una por línea.' });
  }
  if (v.responseType !== 'NONE' && !v.targetRoles.includes('PARENT')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['responseType'], message: 'Para pedir respuesta, incluye a los apoderados como destinatarios.' });
  }
});

/** Opciones de encuesta: una por línea, sin vacías ni repetidas, máximo 6. */
export function parsePollOptions(text?: string): string[] {
  return [...new Set((text ?? '').split('\n').map((o) => o.trim()).filter(Boolean))].slice(0, 6);
}

export type CreateAnnouncementFormData = z.infer<typeof createAnnouncementSchema>;
