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

academicYearRouter.get('/', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'), academicYearController.getAll);
academicYearRouter.post('/', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), academicYearController.create);
academicYearRouter.get('/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'), academicYearController.getById);
academicYearRouter.patch('/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), academicYearController.update);
academicYearRouter.delete('/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), academicYearController.delete);
