import { z } from 'zod';

export const pickupSchema = z.object({
  studentId: z.string().uuid('ID de estudiante inválido'),
  fullName: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(120),
  documentType: z
    .enum(['DNI', 'CE', 'CARNET_EXTRANJERIA', 'PASSPORT', 'PTP', 'OTHER'])
    .default('DNI'),
  documentId: z.string().trim().min(6, 'Documento inválido').max(20),
  relationship: z.string().trim().min(2, 'Indica el parentesco o relación').max(40),
  cellphone: z
    .string()
    .trim()
    .regex(/^9\d{8}$/, 'Celular de 9 dígitos que empiece con 9')
    .optional()
    .nullable()
    .or(z.literal('')),
  photoFileUrl: z
    .string()
    .refine((v) => v.startsWith('/api/files/'), 'Foto inválida')
    .optional()
    .nullable(),
});

export const updatePickupSchema = pickupSchema.omit({ studentId: true }).partial();

export const listPickupsQuerySchema = z.object({
  studentId: z.string().uuid('ID de estudiante inválido'),
});

export type PickupDto = z.infer<typeof pickupSchema>;
export type UpdatePickupDto = z.infer<typeof updatePickupSchema>;
export type ListPickupsQueryDto = z.infer<typeof listPickupsQuerySchema>;
