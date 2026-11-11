import { z } from 'zod';
import { EducationLevel } from '@prisma/client';

// ==========================================
// Criterios / Rubros Evaluativos (Admin)
// ==========================================
export const createCriterionSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  shortName: z.string().min(1, 'La abreviatura es requerida').max(10, 'Máximo 10 caracteres'),
  weight: z.number().positive('El peso debe ser positivo').default(1.0),
  order: z.number().int().min(1).default(1),
  educationLevel: z.nativeEnum(EducationLevel).optional().nullable(),
});

export const updateCriterionSchema = createCriterionSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateCriterionDto = z.infer<typeof createCriterionSchema>;
export type UpdateCriterionDto = z.infer<typeof updateCriterionSchema>;

export const syncHomeworkToMatrixSchema = z.object({
  courseAssignmentId: z.string().uuid(),
  periodNumber: z.number().int().min(1).max(4),
  criterionId: z.string().uuid().optional(),
  targetCriterionId: z.string().uuid().optional(),
  competenceId: z.string().uuid().optional(),
  targetCompetenceId: z.string().uuid().optional(),
  homeworkId: z.string().uuid().optional(),
});

export type SyncHomeworkToMatrixDto = z.infer<typeof syncHomeworkToMatrixSchema>;

// ==========================================
// Escala de Calificaciones Configurable
// ==========================================
export const gradingScaleSchema = z
  .object({
    level: z.enum(['INITIAL', 'PRIMARY', 'SECONDARY']),
    AD: z.number().min(0).max(20),
    A: z.number().min(0).max(20),
    B: z.number().min(0).max(20),
  })
  .refine((v) => v.B > 0 && v.B < v.A && v.A < v.AD, { message: 'Los umbrales deben cumplir 0 < B < A < AD ≤ 20' });

export const gradingScaleQuerySchema = z.object({ level: z.enum(['INITIAL', 'PRIMARY', 'SECONDARY']) });

export type GradingScaleDto = z.infer<typeof gradingScaleSchema>;
export type GradingScaleQueryDto = z.infer<typeof gradingScaleQuerySchema>;
