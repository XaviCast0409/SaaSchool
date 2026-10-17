import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().min(3, 'Ingresa tu DNI o correo electrónico'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

export const changePasswordSchema = z
  .object({
    newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu nueva contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
