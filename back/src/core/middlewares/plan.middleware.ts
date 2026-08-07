import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';
import { prisma } from '../../config/prisma';
import type { SubscriptionPlan } from '@prisma/client';

/**
 * Middleware para restringir endpoints según el Plan de Suscripción contratado por el colegio.
 *
 * @param allowedPlans Lista de planes autorizados para acceder al módulo (ej. 'PRO', 'ENTERPRISE')
 */
export const requirePlan = (...allowedPlans: SubscriptionPlan[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.schoolId) {
        throw new AppError('Usuario no autenticado o sin colegio asignado', 401);
      }

      // Si es SUPER_ADMIN global, omitir restricciones de plan
      if (req.user.role === 'SUPER_ADMIN') {
        return next();
      }

      // Consultar el plan activo del colegio
      const school = await prisma.school.findUnique({
        where: { id: req.user.schoolId },
        select: { plan: true, planExpiresAt: true, isActive: true },
      });

      if (!school || !school.isActive) {
        throw new AppError('La institución escolar no se encuentra activa', 403);
      }

      // Verificar vencimiento del plan
      if (school.planExpiresAt && new Date() > new Date(school.planExpiresAt)) {
        throw new AppError(
          'La suscripción de tu colegio ha vencido. Por favor contacta con administración para renovarla.',
          403
        );
      }

      // Verificar si el plan contratado está en la lista de planes permitidos
      if (!allowedPlans.includes(school.plan)) {
        throw new AppError(
          `Esta funcionalidad requiere el Plan ${allowedPlans.join(' o ')}. El plan actual de tu colegio es ${school.plan}. Contacta con ventas para actualizar tu suscripción.`,
          403
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
