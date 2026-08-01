import { Router } from 'express';
import { AttendanceRepository } from './attendance.repository';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';

const attendanceRepository = new AttendanceRepository();
const attendanceService = new AttendanceService(attendanceRepository);
const attendanceController = new AttendanceController(attendanceService);

export const attendanceRouter = Router();

attendanceRouter.use(authMiddleware, tenantMiddleware);

// Reporte / Resumen mensual de asistencia
attendanceRouter.get(
  '/summary',
  authorizeRoles('SCHOOL_ADMIN', 'TEACHER'),
  attendanceController.getSummary,
);

// Consulta por fecha y/o aula
attendanceRouter.get(
  '/',
  authorizeRoles('SCHOOL_ADMIN', 'TEACHER'),
  attendanceController.getAll,
);

// Asistencia por matrícula (histórico de un estudiante)
attendanceRouter.get(
  '/enrollment/:enrollmentId',
  authorizeRoles('SCHOOL_ADMIN', 'TEACHER'),
  attendanceController.getByEnrollment,
);

// Registro individual
attendanceRouter.post(
  '/',
  authorizeRoles('TEACHER', 'SCHOOL_ADMIN'),
  attendanceController.register,
);

// Registro masivo por sección (bulk)
attendanceRouter.post(
  '/bulk',
  authorizeRoles('TEACHER', 'SCHOOL_ADMIN'),
  attendanceController.registerBulk,
);

// Corregir asistencia ya registrada
attendanceRouter.patch(
  '/:id',
  authorizeRoles('TEACHER', 'SCHOOL_ADMIN'),
  attendanceController.update,
);
