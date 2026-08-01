import { Router } from 'express';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

const authRepository = new AuthRepository();
const authService = new AuthService(authRepository);
const authController = new AuthController(authService);

export const authRouter = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Iniciar sesión con email y contraseña
 * @access  Public
 */
authRouter.post('/login', authController.login);

/**
 * @route   POST /api/auth/register
 * @desc    Registrar un nuevo usuario en un colegio existente
 * @access  Public (proteger con SUPER_ADMIN en producción)
 */
authRouter.post('/register', authController.register);
