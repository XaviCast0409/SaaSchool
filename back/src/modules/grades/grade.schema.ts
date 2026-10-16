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

// ==========================================
// Matriz de Calificaciones (Docente / Cubicol)
// ==========================================
export const getMatrixQuerySchema = z.object({
  courseAssignmentId: z.string().uuid('courseAssignmentId debe ser un UUID válido'),
  periodNumber: z.coerce.number().int().min(1).max(4, 'El periodo debe estar entre 1 y 4'),
});

export const batchGradeItemSchema = z.object({
  enrollmentId: z.string().uuid(),
  competenceId: z.string().uuid(),
  criterionId: z.string().uuid(),
  numericScore: z.number().min(0, 'La nota mínima es 0').max(20, 'La nota máxima es 20'),
  comment: z.string().optional().nullable(),
});

export const batchSaveGradesSchema = z.object({
  courseAssignmentId: z.string().uuid(),
  periodNumber: z.number().int().min(1).max(4),
  grades: z.array(batchGradeItemSchema),
});

export type GetMatrixQueryDto = z.infer<typeof getMatrixQuerySchema>;
export type BatchGradeItemDto = z.infer<typeof batchGradeItemSchema>;
export type BatchSaveGradesDto = z.infer<typeof batchSaveGradesSchema>;

// ==========================================
// Conclusiones Descriptivas por Competencia (Docente)
// ==========================================
export const getConclusionsQuerySchema = z.object({
  courseAssignmentId: z.string().uuid('courseAssignmentId debe ser un UUID válido'),
  competenceId: z
    .string()
    .uuid('competenceId debe ser un UUID válido')
    .optional()
    .or(z.literal(''))
    .transform((val) => val || undefined),
  periodNumber: z.coerce.number().int().min(1).max(4, 'El periodo debe estar entre 1 y 4'),
});

export const batchSaveConclusionsSchema = z.object({
  courseAssignmentId: z.string().uuid(),
  competenceId: z.string().uuid(),
  periodNumber: z.number().int().min(1).max(4),
  conclusions: z.array(
    z.object({
      enrollmentId: z.string().uuid(),
      conclusion: z.string(),
    }),
  ),
});

export type GetConclusionsQueryDto = z.infer<typeof getConclusionsQuerySchema>;
export type BatchSaveConclusionsDto = z.infer<typeof batchSaveConclusionsSchema>;

// ==========================================
// Consolidado SIAGIE (Dirección / Secretaría)
// ==========================================
export const siagieSummaryQuerySchema = z.object({
  classroomId: z.string().uuid(),
  periodNumber: z.coerce.number().int().min(1).max(4),
});

export type SiagieSummaryQueryDto = z.infer<typeof siagieSummaryQuerySchema>;

// ==========================================
// Cierre y Bloqueo de Periodos / Actas (Dirección)
// ==========================================
export const getPeriodLockQuerySchema = z.object({
  periodNumber: z.coerce.number().int().min(1).max(4),
  classroomId: z.string().uuid().optional(),
});

export const togglePeriodLockSchema = z.object({
  periodNumber: z.number().int().min(1).max(4),
  classroomId: z.string().uuid().optional().nullable(),
  isLocked: z.boolean(),
  reason: z.string().optional().nullable(),
});

export type GetPeriodLockQueryDto = z.infer<typeof getPeriodLockQuerySchema>;
export type TogglePeriodLockDto = z.infer<typeof togglePeriodLockSchema>;

// ==========================================
// Esquemas Legacy (Compatibilidad)
// ==========================================
export const createGradeEntrySchema = z.object({
  courseAssignmentId: z.string().uuid(),
  periodNumber: z.number().int().min(1).max(4),
  assessmentType: z.enum(['FORMATIVE', 'SUMMATIVE']).default('FORMATIVE'),
  title: z.string().min(1, 'El título es requerido'),
  weight: z.number().positive().default(1.0),
  maxScore: z.number().positive().default(20.0),
});

export const createGradeSchema = z.object({
  gradeEntryId: z.string().uuid(),
  enrollmentId: z.string().uuid(),
  competenceId: z.string().uuid(),
  numericScore: z.number().min(0),
  teacherComment: z.string().optional(),
});

export type CreateGradeEntryDto = z.infer<typeof createGradeEntrySchema>;
export type CreateGradeDto = z.infer<typeof createGradeSchema>;
