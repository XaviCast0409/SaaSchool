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

enrollmentRouter.get('/', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), enrollmentController.getAll);
enrollmentRouter.post('/', authorizeRoles('SCHOOL_ADMIN'), enrollmentController.create);
enrollmentRouter.get('/:id', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), enrollmentController.getById);
enrollmentRouter.patch('/:id', authorizeRoles('SCHOOL_ADMIN'), enrollmentController.update);
