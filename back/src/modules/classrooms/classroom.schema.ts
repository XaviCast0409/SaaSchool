import { z } from 'zod';
import { isValidGrade } from '../academic/cneb.catalog';

const classroomBase = z.object({
  educationLevel: z.enum(['INITIAL', 'PRIMARY', 'SECONDARY']),
  grade: z.number().int().min(1).max(6),
  section: z.string().trim().min(1, 'La sección es requerida').max(10),
  shift: z.enum(['MORNING', 'AFTERNOON', 'NIGHT']).default('MORNING'),
  capacity: z.number().int().min(1).max(60).default(30),
  tutorTeacherId: z.string().uuid().nullable().optional(),
});

export const createClassroomSchema = classroomBase.superRefine((v, ctx) => {
  if (!isValidGrade(v.educationLevel, v.grade)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['grade'], message: 'El grado no corresponde al nivel (Inicial 3-5, Primaria 1-6, Secundaria 1-5).' });
  }
});

export const updateClassroomSchema = classroomBase.partial();

export type CreateClassroomDto = z.infer<typeof createClassroomSchema>;
export type UpdateClassroomDto = z.infer<typeof updateClassroomSchema>;
