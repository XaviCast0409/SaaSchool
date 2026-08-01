import { Router } from 'express';
import { ClassroomRepository } from './classroom.repository';
import { ClassroomService } from './classroom.service';
import { ClassroomController } from './classroom.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';

const classroomRepository = new ClassroomRepository();
const classroomService = new ClassroomService(classroomRepository);
const classroomController = new ClassroomController(classroomService);

export const classroomRouter = Router();

classroomRouter.use(authMiddleware, tenantMiddleware);

classroomRouter.get('/', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), classroomController.getAll);
classroomRouter.post('/', authorizeRoles('SCHOOL_ADMIN'), classroomController.create);
classroomRouter.get('/:id', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), classroomController.getById);
classroomRouter.patch('/:id', authorizeRoles('SCHOOL_ADMIN'), classroomController.update);
classroomRouter.delete('/:id', authorizeRoles('SCHOOL_ADMIN'), classroomController.delete);
