import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { recordAudit } from '../../utils/audit.util';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { familyRelationshipController } from '../family-relationships/family-relationship.routes';

const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

export const userRouter = Router();

userRouter.use(authMiddleware, tenantMiddleware);

// CRUD de usuarios (Profesores, Padres, Admin)
userRouter.get('/', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'), userController.getAll);
userRouter.post('/', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'), userController.create);
userRouter.get('/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'), userController.getById);
userRouter.patch('/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'), userController.update);
userRouter.delete('/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), userController.deactivate);

// Rol en caja y tesorería (solo Dirección): cajero, tesorero o contador de solo lectura.
// Va aparte de la edición general para que nadie pueda subirse sus propios permisos.
userRouter.patch(
  '/:id/finance-role',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  async (req: Request, res: Response) => {
    const id = z.string().uuid().parse(req.params.id);
    const { financeRole } = z
      .object({ financeRole: z.enum(['CASHIER', 'TREASURER', 'ACCOUNTANT']).nullable() })
      .parse(req.body);
    const user = await prisma.user.findFirst({
      where: { id, schoolId: req.user!.schoolId },
      select: { id: true, role: true, financeRole: true },
    });
    if (!user) throw new AppError('Usuario no encontrado', 404);
    if (user.role !== 'ADMINISTRATIVE') {
      throw new AppError('El rol en finanzas solo se asigna al personal administrativo.', 400);
    }
    const updated = await prisma.user.update({ where: { id }, data: { financeRole }, select: { id: true, financeRole: true } });
    recordAudit(req, {
      action: 'USER_FINANCE_ROLE_CHANGED',
      entity: 'User',
      entityId: id,
      before: { rolFinanzas: user.financeRole },
      after: { rolFinanzas: financeRole },
    });
    res.status(200).json({ status: 'success', data: updated });
  },
);

// Reactivar usuario (undo del soft delete)
userRouter.patch(
  '/:id/reactivate',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  userController.reactivate,
);

// Restablecimiento de contraseña por Dirección / Secretaría (a DNI)
userRouter.post(
  '/:id/reset-password',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  userController.resetPassword,
);

// Ruta anidada: alumnos/hijos de un apoderado
// GET /api/users/:userId/students
userRouter.get(
  '/:userId/students',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  familyRelationshipController.getByParent,
);
