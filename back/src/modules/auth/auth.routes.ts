import { Router } from 'express';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { loginRateLimiter } from '../../core/middlewares/rate-limiter.middleware';

const authRepository = new AuthRepository();
const authService = new AuthService(authRepository);
const authController = new AuthController(authService);

export const authRouter = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Iniciar sesión con DNI / email y contraseña
 * @access  Public
 */
authRouter.post('/login', loginRateLimiter, authController.login);

/**
 * @route   POST /api/auth/change-password
 * @desc    Cambio obligatorio o voluntario de contraseña para el usuario autenticado
 * @access  Private (requiere token JWT)
 */
authRouter.post('/change-password', authMiddleware, authController.changePassword);
