import { z } from 'zod';

export const createClassroomSchema = z.object({
  educationLevel: z.enum(['INITIAL', 'PRIMARY', 'SECONDARY']),
  grade: z.number().int().min(1).max(6),
  section: z.string().min(1, 'La sección es requerida'),
  shift: z.enum(['MORNING', 'AFTERNOON', 'NIGHT']).default('MORNING'),
  capacity: z.number().int().min(1).max(60).default(30),
});

export const updateClassroomSchema = createClassroomSchema.partial();

export type CreateClassroomDto = z.infer<typeof createClassroomSchema>;
export type UpdateClassroomDto = z.infer<typeof updateClassroomSchema>;
