import { z } from 'zod';

export const createCurricularAreaSchema = z.object({
  name: z.string().min(2, 'El nombre del área es requerido'),
  officialCode: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateCurricularAreaSchema = createCurricularAreaSchema.partial();

export const createCompetenceSchema = z.object({
  areaId: z.string().uuid(),
  name: z.string().min(2, 'El nombre de la competencia es requerido'),
  description: z.string().optional(),
});

export type CreateCurricularAreaDto = z.infer<typeof createCurricularAreaSchema>;
export type UpdateCurricularAreaDto = z.infer<typeof updateCurricularAreaSchema>;
export type CreateCompetenceDto = z.infer<typeof createCompetenceSchema>;
