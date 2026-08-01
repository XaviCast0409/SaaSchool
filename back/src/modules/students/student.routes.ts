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

export const studentRouter = Router();

studentRouter.use(authMiddleware, tenantMiddleware);

// CRUD de estudiantes
studentRouter.get(
  '/',
  authorizeRoles('SCHOOL_ADMIN', 'TEACHER', 'SUPER_ADMIN'),
  studentController.getAll,
);
studentRouter.post(
  '/',
  authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'),
  studentController.create,
);
studentRouter.get(
  '/:id',
  authorizeRoles('SCHOOL_ADMIN', 'TEACHER', 'SUPER_ADMIN'),
  studentController.getById,
);
studentRouter.patch(
  '/:id',
  authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'),
  studentController.update,
);
studentRouter.delete(
  '/:id',
  authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'),
  studentController.delete,
);

// Ruta anidada: apoderados/padres de un alumno específico
// GET /api/students/:studentId/parents
studentRouter.get(
  '/:studentId/parents',
  authorizeRoles('SCHOOL_ADMIN', 'TEACHER', 'SUPER_ADMIN'),
  familyRelationshipController.getByStudent,
);
