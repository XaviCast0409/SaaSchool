import { z } from 'zod';

export const createCourseContentSchema = z.object({
  courseAssignmentId: z.string().uuid('courseAssignmentId debe ser un UUID válido'),
  bimester: z.number().int().min(1, 'El bimestre debe ser entre 1 y 4').max(4, 'El bimestre debe ser entre 1 y 4'),
  contentType: z.enum(['LESSON_MATERIAL', 'HOMEWORK', 'FORUM'], {
    errorMap: () => ({ message: 'Tipo de contenido inválido (LESSON_MATERIAL, HOMEWORK, FORUM)' }),
  }),
  title: z.string().trim().min(3, 'El título debe tener al menos 3 caracteres').max(150, 'El título no puede exceder 150 caracteres'),
  description: z.string().trim().min(3, 'La descripción o indicación debe tener al menos 3 caracteres'),
  fileUrl: z.string().trim().optional().nullable(),
  fileName: z.string().trim().optional().nullable(),
  fileType: z.string().trim().optional().nullable(),
  fileSize: z.number().int().positive().optional().nullable(),
  dueDate: z.string().datetime({ message: 'Fecha de entrega inválida' }).optional().nullable(),
});

export const createForumCommentSchema = z.object({
  content: z.string().trim().min(1, 'El comentario no puede estar vacío').max(2000, 'El comentario no puede exceder 2000 caracteres'),
});

export type CreateCourseContentDto = z.infer<typeof createCourseContentSchema>;
export type CreateForumCommentDto = z.infer<typeof createForumCommentSchema>;
