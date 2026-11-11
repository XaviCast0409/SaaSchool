import { Router } from 'express';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { pickupController } from './pickup.controller';

export const pickupRouter = Router();

pickupRouter.use(authMiddleware, tenantMiddleware);

pickupRouter.get(
  '/',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER', 'PARENT'),
  pickupController.list,
);
pickupRouter.post(
  '/',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  pickupController.create,
);
pickupRouter.patch(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  pickupController.update,
);
pickupRouter.delete(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  pickupController.deactivate,
);
