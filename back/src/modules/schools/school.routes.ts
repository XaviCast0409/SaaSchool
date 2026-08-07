import { Router } from 'express';
import { SchoolRepository } from './school.repository';
import { SchoolService } from './school.service';
import { SchoolController } from './school.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';

const schoolRepository = new SchoolRepository();
const schoolService = new SchoolService(schoolRepository);
const schoolController = new SchoolController(schoolService);

export const schoolRouter = Router();

schoolRouter.use(authMiddleware);

// Rutas administrativas de Colegios
schoolRouter.get('/', authorizeRoles('SUPER_ADMIN'), schoolController.getAll);
schoolRouter.post('/', authorizeRoles('SUPER_ADMIN'), schoolController.create);
schoolRouter.get('/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT'), schoolController.getById);
schoolRouter.patch('/:id/reactivate', authorizeRoles('SUPER_ADMIN'), schoolController.reactivate);
schoolRouter.patch('/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), schoolController.update);
schoolRouter.delete('/:id', authorizeRoles('SUPER_ADMIN'), schoolController.deactivate);
