import { Request, Response } from 'express';
import { loginSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema, mfaConfirmSchema } from './auth.schema';
import type { AuthService } from './auth.service';

/**
 * AuthController: Maneja las solicitudes HTTP de autenticación.
 * Extrae y valida datos del request, delega al servicio, retorna la respuesta.
 * CERO lógica de negocio aquí.
 */
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = async (request: Request, response: Response): Promise<void> => {
    const loginDto = loginSchema.parse(request.body);
    const authResponse = await this.authService.login(loginDto);

    response.status(200).json({
      status: 'success',
      data: authResponse,
    });
  };

  changePassword = async (request: Request, response: Response): Promise<void> => {
    const dto = changePasswordSchema.parse(request.body);
    const result = await this.authService.changePassword(request.user!, dto);
    response.status(200).json({ status: 'success', data: result });
  };

  startMfaSetup = async (request: Request, response: Response): Promise<void> => {
    const result = await this.authService.startMfaSetup(request.user!);
    response.status(200).json({ status: 'success', data: result });
  };

  confirmMfaSetup = async (request: Request, response: Response): Promise<void> => {
    const { code } = mfaConfirmSchema.parse(request.body);
    const result = await this.authService.confirmMfaSetup(request.user!, code);
    response.status(200).json({ status: 'success', data: result });
  };

  forgotPassword = async (request: Request, response: Response): Promise<void> => {
    const dto = forgotPasswordSchema.parse(request.body);
    const result = await this.authService.forgotPassword(dto);
    response.status(200).json({ status: 'success', message: result.message });
  };

  resetPassword = async (request: Request, response: Response): Promise<void> => {
    const dto = resetPasswordSchema.parse(request.body);
    const result = await this.authService.resetPassword(dto);
    response.status(200).json({ status: 'success', message: result.message });
  };
}
