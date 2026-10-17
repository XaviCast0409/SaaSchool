import { z } from 'zod';

export const createCourseContentSchema = z.object({
  courseAssignmentId: z.string().uuid({ message: 'Asignación no válida' }),
  bimester: z.coerce.number().int().min(1, 'Mínimo 1° Bimestre').max(4, 'Máximo 4° Bimestre'),
  contentType: z.enum(['LESSON_MATERIAL', 'HOMEWORK', 'FORUM'], {
    errorMap: () => ({ message: 'Tipo de contenido inválido' }),
  }),
  title: z.string().trim().min(3, 'El título debe tener al menos 3 caracteres').max(150, 'Máximo 150 caracteres'),
  description: z.string().trim().max(3000, 'Máximo 3000 caracteres').optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileType: z.string().optional(),
  fileSize: z.number().optional(),
  dueDate: z.string().optional(),
});

export type CreateCourseContentFormData = z.infer<typeof createCourseContentSchema>;

export const createCommentSchema = z.object({
  content: z.string().trim().min(1, 'El mensaje no puede estar vacío').max(2000, 'Máximo 2000 caracteres'),
});

export type CreateCommentFormData = z.infer<typeof createCommentSchema>;
