import { z } from 'zod';

const emptyToUndefined = z.literal('').transform(() => undefined);

export const createSchoolSchema = z.object({
  name: z.string().min(3, 'El nombre del colegio es requerido'),
  documentId: z.string().min(11, 'RUC debe tener 11 dígitos').max(11, 'RUC debe tener 11 dígitos'),
  modularCode: z.string().optional().nullable().or(emptyToUndefined),
  localCode: z.string().optional().nullable().or(emptyToUndefined),
  email: z.string().email('Email institucional inválido').optional().nullable().or(emptyToUndefined),
  phone: z
    .string()
    .regex(/^(\+?51)?\s?9\d{8}$|^0\d{1,2}\d{6,7}$/, 'Número telefónico o celular peruano inválido')
    .optional()
    .nullable()
    .or(emptyToUndefined),
  address: z.string().optional().nullable().or(emptyToUndefined),
  logoUrl: z.string().url('URL del logo inválida').optional().nullable().or(emptyToUndefined),
  department: z.string().optional().nullable().or(emptyToUndefined),
  province: z.string().optional().nullable().or(emptyToUndefined),
  district: z.string().optional().nullable().or(emptyToUndefined),
});

export const updateSchoolSchema = createSchoolSchema.partial();

export type CreateSchoolDto = z.infer<typeof createSchoolSchema>;
export type UpdateSchoolDto = z.infer<typeof updateSchoolSchema>;
