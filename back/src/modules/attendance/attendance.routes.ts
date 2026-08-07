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

// Reporte / Resumen mensual de asistencia (Exclusivo para Admins)
attendanceRouter.get(
  '/summary',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  attendanceController.getSummary,
);

// Consulta por fecha y/o aula (Exclusivo para Admins)
attendanceRouter.get(
  '/',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  attendanceController.getAll,
);

// Asistencia por matrícula (histórico de un estudiante) (Exclusivo para Admins)
attendanceRouter.get(
  '/enrollment/:enrollmentId',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  attendanceController.getByEnrollment,
);

// Registro individual (Exclusivo para Admins)
attendanceRouter.post(
  '/',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  attendanceController.register,
);

// Registro masivo por sección (bulk) (Exclusivo para Admins)
attendanceRouter.post(
  '/bulk',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  attendanceController.registerBulk,
);

// Corregir asistencia ya registrada (Exclusivo para Admins)
attendanceRouter.patch(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'),
  attendanceController.update,
);
