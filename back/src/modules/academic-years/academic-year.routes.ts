import { Router } from 'express';
import { AcademicYearRepository } from './academic-year.repository';
import { AcademicYearService } from './academic-year.service';
import { AcademicYearController } from './academic-year.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';

const academicYearRepository = new AcademicYearRepository();
const academicYearService = new AcademicYearService(academicYearRepository);
const academicYearController = new AcademicYearController(academicYearService);

export const academicYearRouter = Router();

academicYearRouter.use(authMiddleware, tenantMiddleware);

academicYearRouter.get('/', authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER'), academicYearController.getAll);
academicYearRouter.post('/', authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'), academicYearController.create);
academicYearRouter.get('/:id', authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER'), academicYearController.getById);
academicYearRouter.patch('/:id', authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'), academicYearController.update);
academicYearRouter.delete('/:id', authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'), academicYearController.delete);
