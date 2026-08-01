import { z } from 'zod';

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
