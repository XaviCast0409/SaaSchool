import { z } from 'zod';

export const createAcademicYearSchema = z.object({
  year: z.coerce.number().int().min(2000, 'El año debe ser mayor a 2000').max(2100, 'El año es inválido'),
  name: z.string().optional(),
  startDate: z.string().min(1, 'La fecha de inicio es requerida'),
  endDate: z.string().min(1, 'La fecha de fin es requerida'),
  isActive: z.boolean().default(true),
});

export const updateAcademicYearSchema = createAcademicYearSchema.partial();

export type CreateAcademicYearDto = z.infer<typeof createAcademicYearSchema>;
export type UpdateAcademicYearDto = z.infer<typeof updateAcademicYearSchema>;
