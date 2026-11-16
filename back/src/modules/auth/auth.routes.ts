import { Router } from 'express';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { authIpRateLimiter, forgotPasswordRateLimiter, loginRateLimiter } from '../../core/middlewares/rate-limiter.middleware';

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
 * @route   POST /api/auth/forgot-password
 * @desc    Solicitar enlace de recuperación de contraseña vía email
 * @access  Public
 */
authRouter.post('/forgot-password', authIpRateLimiter, forgotPasswordRateLimiter, authController.forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Restablecer contraseña usando token de un solo uso
 * @access  Public
 */
authRouter.post('/reset-password', authIpRateLimiter, authController.resetPassword);

/**
 * @route   POST /api/auth/change-password
 * @desc    Cambio obligatorio o voluntario de contraseña para el usuario autenticado
 * @access  Private (requiere token JWT)
 */
authRouter.post('/change-password', authMiddleware, authController.changePassword);

/**
 * @route   POST /api/auth/mfa/setup  y  POST /api/auth/mfa/confirm
 * @desc    Enrolar la verificación en dos pasos (TOTP) de la cuenta de soporte
 * @access  Private (SUPER_ADMIN)
 */
authRouter.post('/mfa/setup', authMiddleware, authorizeRoles('SUPER_ADMIN'), authController.startMfaSetup);
authRouter.post('/mfa/confirm', authIpRateLimiter, authMiddleware, authorizeRoles('SUPER_ADMIN'), authController.confirmMfaSetup);
