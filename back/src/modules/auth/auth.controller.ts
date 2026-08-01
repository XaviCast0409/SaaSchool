import { Request, Response } from 'express';
import { loginSchema, registerSchema } from './auth.schema';
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

  register = async (request: Request, response: Response): Promise<void> => {
    const registerDto = registerSchema.parse(request.body);
    const authResponse = await this.authService.register(registerDto);

    response.status(201).json({
      status: 'success',
      data: authResponse,
    });
  };
}
