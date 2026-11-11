import { Router } from 'express';
import { CourseAssignmentRepository } from './course-assignment.repository';
import { CourseAssignmentService } from './course-assignment.service';
import { CourseAssignmentController } from './course-assignment.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';

const repository = new CourseAssignmentRepository();
const service = new CourseAssignmentService(repository);
const controller = new CourseAssignmentController(service);

export const courseAssignmentRouter = Router();

courseAssignmentRouter.use(authMiddleware, tenantMiddleware);

// TEACHER puede ver SUS cursos asignados (ruta específica antes del /:id genérico)
courseAssignmentRouter.get(
  '/my-courses',
  authorizeRoles('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'),
  controller.getMyCourses,
);

// Solo ADMIN puede ver todas las asignaciones del colegio
courseAssignmentRouter.get(
  '/',
  authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'),
  controller.getAll,
);
