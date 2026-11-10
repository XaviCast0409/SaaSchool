import { z } from 'zod';
import { Role } from '@prisma/client';
import { PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE } from '../../utils/password.util';

const emptyToUndefined = z.literal('').transform(() => undefined);

const baseUserSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .optional()
    .nullable()
    .or(z.literal('')),
  password: z.string().regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE).optional(),
  firstName: z.string().min(2, 'Nombre requerido'),
  lastNamePaternal: z.string().min(2, 'Apellido paterno requerido'),
  lastNameMaternal: z.string().optional().nullable().or(z.literal('')),
  role: z.enum(['SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT']).default('PARENT'),
  documentType: z
    .enum(['DNI', 'CE', 'CARNET_EXTRANJERIA', 'PASSPORT', 'PNA', 'CODIGO_TEMPORAL', 'PTP', 'BIRTH_CERTIFICATE', 'OTHER'])
    .default('DNI'),
  documentId: z.string().optional(),
  cellphone: z
    .string()
    .regex(/^(\+?51)?\s?9\d{8}$/, 'Número de celular peruano inválido (debe tener 9 dígitos y empezar con 9)')
    .optional()
    .nullable()
    .or(z.string().length(0)),
  educationLevel: z.string().optional().nullable().or(z.literal('')),
});

export const createUserSchema = baseUserSchema.superRefine((data, ctx) => {
  if (data.role !== 'PARENT' && (!data.email || data.email.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El correo electrónico es obligatorio para personal institucional',
      path: ['email'],
    });
  }

  if (data.documentId && data.documentId.trim().length > 0) {
    const trimmedDoc = data.documentId.trim();
    if (data.documentType === 'DNI') {
      if (!/^\d{8}$/.test(trimmedDoc)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El DNI debe tener exactamente 8 dígitos numéricos',
          path: ['documentId'],
        });
      }
    } else if (['CE', 'PTP', 'PASSPORT', 'BIRTH_CERTIFICATE'].includes(data.documentType)) {
      if (!/^[A-Za-z0-9-]{6,15}$/.test(trimmedDoc)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `El documento ${data.documentType} debe tener entre 6 y 15 caracteres alfanuméricos`,
          path: ['documentId'],
        });
      }
    }
  }
});

export const updateUserSchema = baseUserSchema.omit({ password: true }).partial();

export const userFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(500),
  role: z.nativeEnum(Role).optional().or(emptyToUndefined),
  roles: z.string().optional().or(emptyToUndefined),
  staffOnly: z
    .union([z.boolean(), z.string().transform((val) => val === 'true')])
    .optional(),
  search: z.string().optional().or(emptyToUndefined),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type UserFilterDto = z.infer<typeof userFilterSchema>;
