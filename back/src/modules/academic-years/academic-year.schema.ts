import { z } from 'zod';

export const periodConfigItemSchema = z.object({
  periodNumber: z.number().int().min(1).max(4),
  name: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export const createAcademicYearSchema = z.object({
  year: z.coerce.number().int().min(2000, 'El año debe ser mayor a 2000').max(2100, 'El año es inválido'),
  name: z.string().optional(),
  periodType: z.enum(['BIMESTER', 'TRIMESTER']).optional().default('BIMESTER'),
  periodsConfig: z.array(periodConfigItemSchema).optional().nullable(),
  annualCalculationMode: z.enum(['LAST_PERIOD', 'AVERAGE']).optional().default('LAST_PERIOD'),
  startDate: z.string().min(1, 'La fecha de inicio es requerida'),
  endDate: z.string().min(1, 'La fecha de fin es requerida'),
  isActive: z.boolean().default(true),
});

export const updateAcademicYearSchema = createAcademicYearSchema.partial();

export type CreateAcademicYearDto = z.infer<typeof createAcademicYearSchema>;
export type UpdateAcademicYearDto = z.infer<typeof updateAcademicYearSchema>;
