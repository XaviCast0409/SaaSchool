import { Router } from 'express';
import { StudentRepository } from './student.repository';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { familyRelationshipController } from '../family-relationships/family-relationship.routes';

const studentRepository = new StudentRepository();
const studentService = new StudentService(studentRepository);
const studentController = new StudentController(studentService);

export const studentRouter: Router = Router();

studentRouter.use(authMiddleware, tenantMiddleware);

// Catálogos oficiales SIAGIE (debe ir antes de /:id)
studentRouter.get(
  '/catalogs',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'),
  studentController.getCatalogs,
);

// Ficha Unificada de Matrícula SIAGIE (Transaccional)
studentRouter.post(
  '/ficha-matricula',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  studentController.registerFicha,
);

// CRUD de estudiantes
studentRouter.get(
  '/',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'),
  studentController.getAll,
);
studentRouter.post(
  '/',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  studentController.create,
);
studentRouter.get(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'),
  studentController.getById,
);
studentRouter.patch(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'),
  studentController.update,
);
studentRouter.delete(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  studentController.delete,
);

// Ruta anidada: apoderados/padres de un alumno específico
// GET /api/students/:studentId/parents
studentRouter.get(
  '/:studentId/parents',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'),
  familyRelationshipController.getByStudent,
);
