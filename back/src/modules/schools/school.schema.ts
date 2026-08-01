import { z } from 'zod';

export const createSchoolSchema = z.object({
  name: z.string().min(3, 'El nombre del colegio es requerido'),
  documentId: z.string().min(11, 'RUC inválido').max(11, 'RUC inválido'),
  modularCode: z.string().optional(),
  localCode: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  department: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
});

export const updateSchoolSchema = createSchoolSchema.partial();

export type CreateSchoolDto = z.infer<typeof createSchoolSchema>;
export type UpdateSchoolDto = z.infer<typeof updateSchoolSchema>;
