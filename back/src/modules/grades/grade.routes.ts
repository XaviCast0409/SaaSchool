import { Router } from 'express';
import { GradeRepository } from './grade.repository';
import { GradeService } from './grade.service';
import { GradeController } from './grade.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { requirePlan } from '../../core/middlewares/plan.middleware';

const gradeRepository = new GradeRepository();
const gradeService = new GradeService(gradeRepository);
const gradeController = new GradeController(gradeService);

export const gradeRouter = Router();

gradeRouter.use(authMiddleware, tenantMiddleware, requirePlan('PRO', 'ENTERPRISE'));

gradeRouter.get('/enrollment/:enrollmentId', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT'), gradeController.getByEnrollment);
gradeRouter.post('/entries', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'), gradeController.createEntry);
gradeRouter.post('/', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'), gradeController.createGrade);
