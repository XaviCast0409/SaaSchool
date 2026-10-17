import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().min(3, 'Ingresa tu DNI o correo electrónico'),
  password: z.string().min(1, 'Contraseña requerida'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual requerida').optional(),
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
});

export const registerSchema = z.object({
  schoolId: z.string().uuid('schoolId debe ser un UUID válido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  firstName: z.string().min(2, 'Nombre requerido'),
  lastNamePaternal: z.string().min(2, 'Apellido paterno requerido'),
  lastNameMaternal: z.string().min(2, 'Apellido materno requerido'),
  documentType: z.enum(['DNI', 'CE', 'PASSPORT', 'PNA', 'OTHER']).default('DNI'),
  documentId: z.string().optional(),
  cellphone: z.string().optional(),
  role: z.enum(['SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT']).default('PARENT'),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
