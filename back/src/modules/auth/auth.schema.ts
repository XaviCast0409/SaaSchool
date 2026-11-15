import { z } from 'zod';
import { PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE } from '../../utils/password.util';

export const loginSchema = z.object({
  email: z.string().trim().min(3, 'Ingresa tu correo, DNI o código de estudiante').max(120),
  password: z.string().min(1, 'Contraseña requerida').max(200),
  // Código del colegio (página /c/<código>): limita la búsqueda de la cuenta a ese colegio
  schoolSlug: z.string().trim().toLowerCase().max(40).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual requerida').max(200).optional(),
  newPassword: z.string().max(200).regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Correo electrónico no válido').max(150),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Token requerido'),
  newPassword: z.string().max(200).regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
