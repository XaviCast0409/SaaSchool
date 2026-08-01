import { z } from 'zod';

export const createAcademicYearSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  name: z.string().optional(),
  startDate: z.string().datetime({ message: 'Fecha de inicio inválida (ISO 8601)' }),
  endDate: z.string().datetime({ message: 'Fecha de fin inválida (ISO 8601)' }),
  isActive: z.boolean().default(true),
});

export const updateAcademicYearSchema = createAcademicYearSchema.partial();

export type CreateAcademicYearDto = z.infer<typeof createAcademicYearSchema>;
export type UpdateAcademicYearDto = z.infer<typeof updateAcademicYearSchema>;
