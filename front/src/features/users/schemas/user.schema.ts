import { z } from 'zod';

export const createUserSchema = z
  .object({
    email: z
      .string()
      .email('Ingresa un correo electrónico válido')
      .optional()
      .or(z.literal('')),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    firstName: z.string().min(2, 'Nombre requerido (mínimo 2 caracteres)'),
    lastNamePaternal: z.string().min(2, 'Apellido paterno requerido'),
    lastNameMaternal: z.string().optional().or(z.literal('')),
    role: z.enum(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT', 'STUDENT']),
    documentType: z.enum(['DNI', 'CE', 'PTP', 'PASSPORT', 'OTHER']).default('DNI'),
    documentId: z.string().min(1, 'Número de documento requerido'),
    cellphone: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role !== 'PARENT' && (!data.email || data.email.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El correo electrónico es obligatorio para personal docente y administrativo',
        path: ['email'],
      });
    }
    if (data.documentType === 'DNI') {
      if (!/^\d{8}$/.test(data.documentId.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El DNI debe constar de exactamente 8 dígitos numéricos',
          path: ['documentId'],
        });
      }
    } else if (['CE', 'PTP', 'PASSPORT'].includes(data.documentType)) {
      if (!/^[A-Za-z0-9-]{6,15}$/.test(data.documentId.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El documento extranjero debe tener entre 6 y 15 caracteres alfanuméricos',
          path: ['documentId'],
        });
      }
    }
  });

export const updateUserSchema = z.object({
  email: z.string().email().optional().or(z.literal('')),
  firstName: z.string().min(2).optional(),
  lastNamePaternal: z.string().min(2).optional(),
  lastNameMaternal: z.string().optional().nullable(),
  role: z.enum(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT', 'STUDENT']).optional(),
  documentType: z.enum(['DNI', 'CE', 'PTP', 'PASSPORT', 'OTHER']).optional(),
  documentId: z.string().optional(),
  cellphone: z.string().optional().nullable(),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
