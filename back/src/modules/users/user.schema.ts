import { z } from 'zod';
import { Role } from '@prisma/client';

const emptyToUndefined = z.literal('').transform(() => undefined);

export const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  firstName: z.string().min(2, 'Nombre requerido'),
  lastNamePaternal: z.string().min(2, 'Apellido paterno requerido'),
  lastNameMaternal: z.string().min(2, 'Apellido materno requerido'),
  role: z.enum(['SCHOOL_ADMIN', 'TEACHER', 'PARENT']).default('PARENT'),
  documentType: z.enum(['DNI', 'CE', 'PASSPORT', 'PNA', 'OTHER']).default('DNI'),
  documentId: z.string().optional(),
  cellphone: z
    .string()
    .regex(/^(\+?51)?\s?9\d{8}$/, 'Número de celular peruano inválido (debe tener 9 dígitos y empezar con 9)')
    .optional()
    .nullable()
    .or(z.string().length(0)),
});

export const updateUserSchema = createUserSchema.omit({ password: true }).partial();

export const userFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  role: z.nativeEnum(Role).optional().or(emptyToUndefined),
  search: z.string().optional().or(emptyToUndefined),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type UserFilterDto = z.infer<typeof userFilterSchema>;
