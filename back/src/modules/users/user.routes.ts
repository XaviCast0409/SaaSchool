import { Router } from 'express';
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
userRouter.get('/', authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'), userController.getAll);
userRouter.post('/', authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'), userController.create);
userRouter.get('/:id', authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'), userController.getById);
userRouter.patch('/:id', authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'), userController.update);
userRouter.delete('/:id', authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'), userController.deactivate);

// Reactivar usuario (undo del soft delete)
userRouter.patch(
  '/:id/reactivate',
  authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'),
  userController.reactivate,
);

// Ruta anidada: alumnos/hijos de un apoderado
// GET /api/users/:userId/students
userRouter.get(
  '/:userId/students',
  authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'),
  familyRelationshipController.getByParent,
);
