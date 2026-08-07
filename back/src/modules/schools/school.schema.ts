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
  plan: z.enum(['BASIC', 'PRO', 'ENTERPRISE']).optional(),
  planExpiresAt: z.string().optional().nullable().or(emptyToUndefined),
  // Datos opcionales para crear el usuario Administrador Inicial en el onboarding
  adminEmail: z.string().email('Email de administrador inválido').optional().nullable().or(emptyToUndefined),
  adminPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional().nullable().or(emptyToUndefined),
  adminFirstName: z.string().optional().nullable().or(emptyToUndefined),
  adminLastNamePaternal: z.string().optional().nullable().or(emptyToUndefined),
  adminLastNameMaternal: z.string().optional().nullable().or(emptyToUndefined),
  adminDocumentId: z.string().optional().nullable().or(emptyToUndefined),
  adminCellphone: z.string().optional().nullable().or(emptyToUndefined),
});

/**
 * Schema de actualización: excluye los campos de onboarding del administrador y
 * relaja la validación del teléfono para aceptar números ya guardados en cualquier
 * formato válido (con/sin código de país, con/sin espacios).
 */
export const updateSchoolSchema = createSchoolSchema
  .omit({
    adminEmail: true,
    adminPassword: true,
    adminFirstName: true,
    adminLastNamePaternal: true,
    adminLastNameMaternal: true,
    adminDocumentId: true,
    adminCellphone: true,
  })
  .extend({
    // En actualización, phone acepta cualquier formato de 6-20 caracteres (más permisivo)
    phone: z
      .string()
      .min(6, 'El teléfono debe tener al menos 6 dígitos')
      .max(20, 'El teléfono no puede exceder 20 caracteres')
      .optional()
      .nullable()
      .or(emptyToUndefined),
  })
  .partial();

export type CreateSchoolDto = z.infer<typeof createSchoolSchema>;
export type UpdateSchoolDto = z.infer<typeof updateSchoolSchema>;
