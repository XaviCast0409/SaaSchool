import { Router } from 'express';
import { EnrollmentRepository } from './enrollment.repository';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentController } from './enrollment.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';

const enrollmentRepository = new EnrollmentRepository();
const enrollmentService = new EnrollmentService(enrollmentRepository);
const enrollmentController = new EnrollmentController(enrollmentService);

export const enrollmentRouter = Router();

enrollmentRouter.use(authMiddleware, tenantMiddleware);

enrollmentRouter.get('/', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'), enrollmentController.getAll);
enrollmentRouter.post('/', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'), enrollmentController.create);
enrollmentRouter.get('/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'), enrollmentController.getById);
enrollmentRouter.patch('/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'), enrollmentController.update);
